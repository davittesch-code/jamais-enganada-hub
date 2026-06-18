import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface CriarClienteInput {
  email: string;
  password: string;
  full_name: string;
  advogado_id: string | null;
  ativo: boolean;
}

export const criarClienteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CriarClienteInput) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created.user) {
      return { ok: false as const, error: createErr?.message ?? "Falha ao criar usuário" };
    }

    const userId = created.user.id;

    // Aguarda o trigger handle_new_user criar o profile (executa imediatamente).
    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        advogado_id: data.advogado_id,
        consultas_limit: 17,
        perfil_generations_limit: 2,
        plataforma_start_date: new Date().toISOString(),
        plano_expira_em: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: data.ativo ? "ativo" : "pendente",
      })
      .eq("id", userId);

    if (updErr) {
      return { ok: false as const, error: updErr.message };
    }

    return { ok: true as const, user_id: userId, email: data.email };
  });
