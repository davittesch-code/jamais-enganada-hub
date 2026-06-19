import { supabase } from "@/integrations/supabase/client";

export type EtapaProgresso = "onboarding" | "consulta";

type ProgressoRow = {
  user_id: string;
  etapa: EtapaProgresso;
  mensagens: unknown;
  contexto: unknown;
  indice_atual: number;
  concluido: boolean;
  updated_at?: string | null;
};

// A tabela `progresso_conversa` ainda não está no types.ts gerado.
// Fazemos um cast pontual para evitar acoplamento ao tipo gerado.
type AnySupabase = {
  from: (table: string) => {
    upsert: (
      values: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => Promise<{ error: unknown }>;
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{ data: ProgressoRow | null; error: unknown }>;
        };
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (
        col: string,
        val: string,
      ) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  };
};

function db(): AnySupabase {
  return supabase as unknown as AnySupabase;
}

export async function saveProgresso(params: {
  userId: string;
  etapa: EtapaProgresso;
  mensagens: unknown;
  contexto: unknown;
  indiceAtual: number;
  concluido?: boolean;
}): Promise<void> {
  try {
    await db()
      .from("progresso_conversa")
      .upsert(
        {
          user_id: params.userId,
          etapa: params.etapa,
          mensagens: params.mensagens,
          contexto: params.contexto,
          indice_atual: params.indiceAtual,
          concluido: params.concluido ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,etapa" },
      );
  } catch (e) {
    console.error("saveProgresso failed", e);
  }
}

export async function loadProgresso(
  userId: string,
  etapa: EtapaProgresso,
): Promise<ProgressoRow | null> {
  try {
    const { data } = await db()
      .from("progresso_conversa")
      .select("*")
      .eq("user_id", userId)
      .eq("etapa", etapa)
      .maybeSingle();
    if (data && !data.concluido) return data;
    return null;
  } catch (e) {
    console.error("loadProgresso failed", e);
    return null;
  }
}

export async function markProgressoConcluido(
  userId: string,
  etapa: EtapaProgresso,
): Promise<void> {
  try {
    await db()
      .from("progresso_conversa")
      .update({ concluido: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("etapa", etapa);
  } catch (e) {
    console.error("markProgressoConcluido failed", e);
  }
}
