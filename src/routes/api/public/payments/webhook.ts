import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

async function processCompletedTransaction(data: any, env: PaddleEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const customData = data.customData ?? {};
  const tipoProduto: string | undefined = customData.tipo_produto;
  const email: string | undefined = customData.email;
  const nome: string | undefined = customData.nome;
  const advogadaId: string | null = customData.advogada_id ?? null;
  const transactionId: string = data.id;
  const valorCents = Number(
    data.details?.totals?.total ?? data.items?.[0]?.price?.unitPrice?.amount ?? 0,
  );
  const valor = valorCents / 100;

  if (!email) {
    console.warn("[paddle-webhook] sem email no customData", { transactionId });
    return;
  }

  // Idempot\u00eancia
  const { data: existente } = await supabaseAdmin
    .from("pagamentos")
    .select("id")
    .eq("paddle_transaction_id", transactionId)
    .maybeSingle();
  if (existente) {
    console.log("[paddle-webhook] j\u00e1 processado", { transactionId });
    return;
  }

  let userId: string | null = null;
  let statusPagamento = "completo";

  if (tipoProduto === "acesso") {
    const redirectTo =
      (process.env.SITE_URL ?? "https://jamaisenganada.com.br") + "/criar-senha";

    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: nome ?? "" },
        redirectTo,
      });

    if (inviteErr) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      userId = found?.id ?? null;
    } else {
      userId = invited.user?.id ?? null;
    }

    if (userId) {
      // Renova/cria entitlement. Se j\u00e1 existir expira_em no futuro,
      // soma 1 ano em cima da data atual; sen\u00e3o, conta a partir de agora.
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("plano_expira_em, consultas_limit, perfil_generations_limit")
        .eq("id", userId)
        .maybeSingle();

      const base =
        existing?.plano_expira_em && new Date(existing.plano_expira_em) > new Date()
          ? new Date(existing.plano_expira_em).getTime()
          : Date.now();

      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: nome ?? undefined,
          status: "ativo",
          advogado_id: advogadaId,
          consultas_limit: (existing?.consultas_limit ?? 0) + 17,
          perfil_generations_limit: (existing?.perfil_generations_limit ?? 0) + 2,
          plataforma_start_date: new Date().toISOString(),
          plano_expira_em: new Date(base + ONE_YEAR_MS).toISOString(),
          plan_type: "base",
        })
        .eq("id", userId);
    }
  } else if (tipoProduto === "recarga") {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, consultas_limit, perfil_generations_limit, plano_expira_em")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      // Recarga sem conta: registra como \u00f3rf\u00e3o e n\u00e3o credita.
      statusPagamento = "orfao_recarga";
      console.warn("[paddle-webhook] recarga sem profile", { email, transactionId });
    } else {
      userId = profile.id;
      const base =
        profile.plano_expira_em && new Date(profile.plano_expira_em) > new Date()
          ? new Date(profile.plano_expira_em).getTime()
          : Date.now();

      await supabaseAdmin
        .from("profiles")
        .update({
          consultas_limit: (profile.consultas_limit ?? 0) + 10,
          perfil_generations_limit: (profile.perfil_generations_limit ?? 0) + 1,
          plano_expira_em: new Date(base + ONE_YEAR_MS).toISOString(),
          plan_type: "extra",
        })
        .eq("id", userId);
    }
  }

  await supabaseAdmin.from("pagamentos").insert({
    email,
    user_id: userId,
    produto: tipoProduto ?? "desconhecido",
    valor,
    paddle_transaction_id: transactionId,
    status: statusPagamento,
    environment: env,
    metadata: { customData, items: data.items },
  });
}

/**
 * Refund: revoga acesso (acesso) ou subtrai cr\u00e9ditos (recarga),
 * conforme decis\u00e3o de neg\u00f3cio "revogar tudo".
 */
async function processAdjustmentCreated(data: any, env: PaddleEnv) {
  if (data.action !== "refund") {
    console.log("[paddle-webhook] adjustment ignorado", data.action);
    return;
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const transactionId: string | undefined = data.transactionId;
  if (!transactionId) return;

  const { data: pagamento } = await supabaseAdmin
    .from("pagamentos")
    .select("id, user_id, produto, status")
    .eq("paddle_transaction_id", transactionId)
    .maybeSingle();

  if (!pagamento || pagamento.status === "reembolsado") return;

  if (pagamento.user_id) {
    if (pagamento.produto === "acesso") {
      await supabaseAdmin
        .from("profiles")
        .update({
          status: "cancelado",
          plano_expira_em: new Date().toISOString(),
        })
        .eq("id", pagamento.user_id);
    } else if (pagamento.produto === "recarga") {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("consultas_limit, perfil_generations_limit")
        .eq("id", pagamento.user_id)
        .maybeSingle();
      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            consultas_limit: Math.max(0, (profile.consultas_limit ?? 0) - 10),
            perfil_generations_limit: Math.max(0, (profile.perfil_generations_limit ?? 0) - 1),
          })
          .eq("id", pagamento.user_id);
      }
    }
  }

  await supabaseAdmin
    .from("pagamentos")
    .update({
      status: "reembolsado",
      metadata: { ...((pagamento as any).metadata ?? {}), refund: data, refund_env: env },
    })
    .eq("id", pagamento.id);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") ?? "sandbox") as PaddleEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.eventType) {
            case EventName.TransactionCompleted:
              await processCompletedTransaction(event.data, env);
              break;
            case EventName.AdjustmentCreated:
              await processAdjustmentCreated(event.data, env);
              break;
            default:
              console.log("[paddle-webhook] evento ignorado", event.eventType);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[paddle-webhook] erro", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
