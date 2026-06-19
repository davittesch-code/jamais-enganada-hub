import { createServerFn } from "@tanstack/react-start";

/**
 * Verifica o status de um email antes de abrir o checkout.
 * - "none": nenhum cadastro \u2014 segue para checkout normal.
 * - "active": j\u00e1 tem acesso ativo \u2014 frontend manda fazer login.
 * - "expired": tinha conta mas acesso venceu \u2014 segue para renova\u00e7\u00e3o.
 */
export const checkEmailStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => ({
    email: (data?.email ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }) => {
    if (!data.email) return { status: "none" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, plano_expira_em, status")
      .ilike("email", data.email)
      .maybeSingle();

    if (!profile) return { status: "none" as const };

    const ativo =
      profile.status === "ativo" &&
      profile.plano_expira_em &&
      new Date(profile.plano_expira_em) > new Date();

    return { status: (ativo ? "active" : "expired") as "active" | "expired" };
  });

/**
 * Reenvia o link de cria\u00e7\u00e3o de senha (ou login) para um email j\u00e1 cadastrado.
 * N\u00e3o vaza se o email existe ou n\u00e3o.
 */
export const resendInviteEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => ({
    email: (data?.email ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }) => {
    if (!data.email) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const siteUrl = process.env.SITE_URL ?? "https://jamaisenganada.com.br";

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();

    if (profile?.id) {
      // Usu\u00e1ria j\u00e1 existe \u2014 manda magic link para reset/cria\u00e7\u00e3o de senha.
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo: `${siteUrl}/criar-senha` },
      });
    } else {
      // Sem profile: pode ser que o pagamento ainda n\u00e3o foi processado \u2014
      // tentamos um convite. Se j\u00e1 existir no auth, n\u00e3o faz mal.
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        redirectTo: `${siteUrl}/criar-senha`,
      });
    }
    return { ok: true as const };
  });
