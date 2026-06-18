
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consultas_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consultas_limit integer NOT NULL DEFAULT 17,
  ADD COLUMN IF NOT EXISTS consultas_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_consulta_date date,
  ADD COLUMN IF NOT EXISTS plataforma_start_date timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS plano_expira_em timestamptz NOT NULL DEFAULT (now() + interval '1 year');

CREATE OR REPLACE FUNCTION public.pode_fazer_consulta(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_profile record;
  v_dias_plataforma int;
  v_limite_hoje int;
  v_consultas_hoje int;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  IF v_profile IS NULL THEN
    RETURN json_build_object('pode', false, 'motivo', 'sem_perfil');
  END IF;

  IF v_profile.plano_expira_em < now() THEN
    RETURN json_build_object('pode', false, 'motivo', 'plano_expirado');
  END IF;

  IF v_profile.consultas_used >= v_profile.consultas_limit THEN
    RETURN json_build_object(
      'pode', false, 'motivo', 'limite_total',
      'usadas', v_profile.consultas_used, 'limite', v_profile.consultas_limit
    );
  END IF;

  v_dias_plataforma := GREATEST(0, EXTRACT(DAY FROM (now() - v_profile.plataforma_start_date))::int);

  IF v_profile.last_consulta_date IS DISTINCT FROM CURRENT_DATE THEN
    v_consultas_hoje := 0;
  ELSE
    v_consultas_hoje := v_profile.consultas_today;
  END IF;

  IF v_dias_plataforma = 0 THEN
    v_limite_hoje := 5;
  ELSIF v_dias_plataforma <= 7 THEN
    v_limite_hoje := 2;
  ELSE
    v_limite_hoje := 9999;
  END IF;

  IF v_consultas_hoje >= v_limite_hoje THEN
    RETURN json_build_object(
      'pode', false, 'motivo', 'limite_diario',
      'limite_hoje', v_limite_hoje, 'dias_plataforma', v_dias_plataforma,
      'consultas_restantes', v_profile.consultas_limit - v_profile.consultas_used
    );
  END IF;

  RETURN json_build_object(
    'pode', true,
    'consultas_restantes', v_profile.consultas_limit - v_profile.consultas_used,
    'restantes_hoje', v_limite_hoje - v_consultas_hoje,
    'limite_hoje', v_limite_hoje,
    'dias_plataforma', v_dias_plataforma
  );
END; $$;

CREATE OR REPLACE FUNCTION public.registrar_consulta(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE v_consultas_hoje int;
BEGIN
  SELECT CASE
    WHEN last_consulta_date IS DISTINCT FROM CURRENT_DATE THEN 1
    ELSE consultas_today + 1
  END INTO v_consultas_hoje
  FROM public.profiles WHERE id = p_user_id;

  UPDATE public.profiles SET
    consultas_used = consultas_used + 1,
    consultas_today = v_consultas_hoje,
    last_consulta_date = CURRENT_DATE
  WHERE id = p_user_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.pode_fazer_consulta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_consulta(uuid) TO authenticated;
