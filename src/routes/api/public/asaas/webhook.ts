// Asaas webhook receiver.
// Configure in Asaas: Configurações → Integrações → Webhooks
// URL: https://jamaisenganada.com.br/api/public/asaas/webhook
// Token: o mesmo valor de ASAAS_WEBHOOK_TOKEN
// Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_REFUNDED
import { createFileRoute } from "@tanstack/react-router";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type AsaasWebhookEvent = {
  event: string;
  payment: {
    id: string;
    status: string;
    value: number;
    netValue?: number;
    billingType: string;
    installmentCount?: number;
    externalReference?: string | null;
  };
};

type ExternalRef = {
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  tipo_produto?: "acesso" | "recarga";
  advogada_id?: string | null;
};

function parseExternalRef(raw: string | null | undefined): ExternalRef {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ExternalRef;
  } catch {
    return {};
  }
}

async function processPaymentConfirmed(payment: AsaasWebhookEvent["payment"]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ref = parseExternalRef(payment.externalReference);
  const email = ref.email?.toLowerCase();
  const nome = ref.nome;
  const tipo = ref.tipo_produto;
  const advogadaId = ref.advogada_id ?? null;

  if (!email || !tipo) {
    console.warn("[asaas-webhook] externalReference incompleto", { id: payment.id });
    return;
  }

  // Idempotência
  const { data: existente } = await supabaseAdmin
    .from("pagamentos")
    .select("id")
    .eq("asaas_payment_id", payment.id)
    .maybeSingle();
  if (existente) {
    console.log("[asaas-webhook] já processado", payment.id);
    return;
  }

  let userId: string | null = null;
  let statusPagamento = "completo";
  const forma = payment.billingType === "PIX" ? "PIX" : "CREDIT_CARD";

  if (tipo === "acesso") {
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
    } else {
      const redirectTo =
        (process.env.SITE_URL ?? "https://jamaisenganada.com.br") + "/criar-senha";
      const { data: invited, error: inviteErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: nome ?? "" },
          redirectTo,
        });
      if (!inviteErr) {
        userId = invited.user?.id ?? null;
      } else {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        const found = list?.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        userId = found?.id ?? null;
      }
    }

    if (userId) {
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
          cpf: ref.cpf ?? undefined,
          telefone: ref.telefone ?? undefined,
        } as any)
        .eq("id", userId);
    }
  } else if (tipo === "recarga") {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, consultas_limit, perfil_generations_limit, plano_expira_em")
      .ilike("email", email)
      .maybeSingle();

    if (!profile) {
      statusPagamento = "orfao_recarga";
      console.warn("[asaas-webhook] recarga sem profile", { email });
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
    produto: tipo,
    valor: payment.value,
    status: statusPagamento,
    environment:
      (process.env.ASAAS_API_URL ?? "").includes("sandbox") ? "sandbox" : "live",
    metadata: { asaas: payment, externalReference: ref } as any,
    asaas_payment_id: payment.id,
    forma_pagamento: forma,
    parcelas: payment.installmentCount ?? 1,
  } as any);
}

async function processPaymentRefunded(payment: AsaasWebhookEvent["payment"]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pagamento } = await supabaseAdmin
    .from("pagamentos")
    .select("id, user_id, produto, status")
    .eq("asaas_payment_id", payment.id)
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
            perfil_generations_limit: Math.max(
              0,
              (profile.perfil_generations_limit ?? 0) - 1,
            ),
          })
          .eq("id", pagamento.user_id);
      }
    }
  }

  await supabaseAdmin
    .from("pagamentos")
    .update({ status: "reembolsado" })
    .eq("id", pagamento.id);
}

export const Route = createFileRoute("/api/public/asaas/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ASAAS_WEBHOOK_TOKEN;
        const provided = request.headers.get("asaas-access-token");
        if (!expected || provided !== expected) {
          console.warn("[asaas-webhook] token inválido");
          return new Response("Unauthorized", { status: 401 });
        }

        let body: AsaasWebhookEvent;
        try {
          body = (await request.json()) as AsaasWebhookEvent;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        try {
          switch (body.event) {
            case "PAYMENT_CONFIRMED":
            case "PAYMENT_RECEIVED":
              await processPaymentConfirmed(body.payment);
              break;
            case "PAYMENT_REFUNDED":
              await processPaymentRefunded(body.payment);
              break;
            default:
              console.log("[asaas-webhook] evento ignorado", body.event);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[asaas-webhook] erro", e);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
