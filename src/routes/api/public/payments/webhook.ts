import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

async function processCompletedTransaction(data: any, env: PaddleEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const customData = data.customData ?? {};
  const tipoProduto: string | undefined = customData.tipo_produto;
  const email: string | undefined = customData.email;
  const nome: string | undefined = customData.nome;
  const advogadaId: string | null = customData.advogada_id ?? null;
  const transactionId: string = data.id;
  const valorCents = Number(data.details?.totals?.total ?? data.items?.[0]?.price?.unitPrice?.amount ?? 0);
  const valor = valorCents / 100;

  if (!email) {
    console.warn("[paddle-webhook] sem email no customData", { transactionId });
    return;
  }

  // Idempotência — se já registramos este transaction_id, ignorar.
  const { data: existente } = await supabaseAdmin
    .from("pagamentos")
    .select("id")
    .eq("paddle_transaction_id", transactionId)
    .maybeSingle();
  if (existente) {
    console.log("[paddle-webhook] já processado", { transactionId });
    return;
  }

  let userId: string | null = null;

  if (tipoProduto === "acesso") {
    // Cria usuário (se não existir) e dispara email de convite com link para criar senha
    const redirectTo =
      (process.env.SITE_URL ?? "https://jamaisenganada.com.br") + "/criar-senha";

    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: nome ?? "" },
        redirectTo,
      });

    if (inviteErr) {
      // Usuária pode já existir — tentar localizar
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      userId = found?.id ?? null;
      if (!userId) {
        console.error("[paddle-webhook] inviteUserByEmail falhou", inviteErr);
      }
    } else {
      userId = invited.user?.id ?? null;
    }

    if (userId) {
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name: nome ?? undefined,
          status: "ativo",
          advogado_id: advogadaId,
          consultas_limit: 17,
          perfil_generations_limit: 2,
          plataforma_start_date: new Date().toISOString(),
          plano_expira_em: new Date(Date.now() + oneYearMs).toISOString(),
          plan_type: "base",
        })
        .eq("id", userId);
    }
  } else if (tipoProduto === "recarga") {
    // Busca usuária pelo email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, consultas_limit, perfil_generations_limit")
      .eq("email", email)
      .maybeSingle();

    if (profile) {
      userId = profile.id;
      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      await supabaseAdmin
        .from("profiles")
        .update({
          consultas_limit: (profile.consultas_limit ?? 0) + 10,
          perfil_generations_limit: (profile.perfil_generations_limit ?? 0) + 1,
          plano_expira_em: new Date(Date.now() + oneYearMs).toISOString(),
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
    status: "completo",
    environment: env,
    metadata: { customData, items: data.items },
  });
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
