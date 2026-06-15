import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/_seed-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const token = body?.token;
        if (token !== "jamais-seed-2026") {
          return new Response("forbidden", { status: 403 });
        }
        const email = body?.email as string;
        const password = body?.password as string;
        if (!email || !password) {
          return new Response("missing", { status: 400 });
        }
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Create or find user
        let userId: string | null = null;
        const created = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Juliana" },
        });
        if (created.error) {
          // Maybe exists — find via listUsers
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const found = list?.users.find((u) => u.email === email);
          if (!found) {
            return new Response(
              JSON.stringify({ error: created.error.message }),
              { status: 500 }
            );
          }
          userId = found.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        } else {
          userId = created.data.user!.id;
        }

        // Ensure profile is admin/ativo
        await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: userId!,
              email,
              full_name: "Juliana",
              role: "admin",
              status: "ativo",
            },
            { onConflict: "id" }
          );

        // Demote previous admins
        await supabaseAdmin
          .from("profiles")
          .update({ role: "cliente" })
          .eq("role", "admin")
          .neq("id", userId!);

        return new Response(JSON.stringify({ ok: true, userId }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
