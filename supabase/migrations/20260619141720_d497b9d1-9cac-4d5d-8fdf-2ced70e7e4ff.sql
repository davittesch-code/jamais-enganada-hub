CREATE TABLE IF NOT EXISTS public.progresso_conversa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  etapa text NOT NULL CHECK (etapa IN ('onboarding','consulta')),
  mensagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  indice_atual integer NOT NULL DEFAULT 0,
  concluido boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, etapa)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progresso_conversa TO authenticated;
GRANT ALL ON public.progresso_conversa TO service_role;

ALTER TABLE public.progresso_conversa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progresso_proprio_select" ON public.progresso_conversa
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "progresso_proprio_insert" ON public.progresso_conversa
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "progresso_proprio_update" ON public.progresso_conversa
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "progresso_proprio_delete" ON public.progresso_conversa
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_progresso_conversa_touch
  BEFORE UPDATE ON public.progresso_conversa
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_progresso_conversa_user_etapa
  ON public.progresso_conversa (user_id, etapa);