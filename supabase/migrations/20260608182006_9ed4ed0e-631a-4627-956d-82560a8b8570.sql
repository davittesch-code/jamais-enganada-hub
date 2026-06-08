
CREATE TABLE public.profile_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  areas jsonb DEFAULT '{}'::jsonb,
  insights jsonb DEFAULT '[]'::jsonb,
  attention_points jsonb DEFAULT '[]'::jsonb,
  next_steps jsonb DEFAULT '[]'::jsonb,
  radar_scores jsonb DEFAULT '{}'::jsonb,
  extra_data jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profile_history_user_id_idx ON public.profile_history(user_id, archived_at DESC);

GRANT SELECT, INSERT, DELETE ON public.profile_history TO authenticated;
GRANT ALL ON public.profile_history TO service_role;

ALTER TABLE public.profile_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all profile_history"
  ON public.profile_history
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
