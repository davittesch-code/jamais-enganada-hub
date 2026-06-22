import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DOC_VERSAO_TERMOS = "2026-06-19";
export const DOC_VERSAO_PRIVACIDADE = "2026-06-19";
export const DOC_VERSAO_AVISO_INFORMATIVO = "2026-06-22";

type Documento = "termos" | "privacidade" | "cookies" | "aviso_informativo";

function getClientIp(req: Request): string | null {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("true-client-ip") ||
    null
  );
}

export const registrarConsentimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { documentos: Array<{ documento: Documento; versao: string }> }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const req = getRequest();
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    const rows = data.documentos.map((d) => ({
      user_id: context.userId,
      documento: d.documento,
      versao: d.versao,
      ip,
      user_agent: userAgent,
    }));

    const { error } = await context.supabase
      .from("consentimentos")
      .insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
