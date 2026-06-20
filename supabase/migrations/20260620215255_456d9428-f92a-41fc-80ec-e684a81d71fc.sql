CREATE TABLE public.consentimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento TEXT NOT NULL CHECK (documento IN ('termos','privacidade','cookies')),
  versao TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX consentimentos_user_id_idx ON public.consentimentos(user_id);

GRANT SELECT, INSERT ON public.consentimentos TO authenticated;
GRANT ALL ON public.consentimentos TO service_role;

ALTER TABLE public.consentimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_consent"
  ON public.consentimentos FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "users_insert_own_consent"
  ON public.consentimentos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);