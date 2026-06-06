
-- 1. Restrict advogados SELECT: drop public-authenticated read; admin policy stays.
DROP POLICY IF EXISTS advogados_read_active ON public.advogados;

-- 2. Safe RPC returning only non-sensitive fields for onboarding picker.
CREATE OR REPLACE FUNCTION public.list_advogadas_publicas()
RETURNS TABLE (id uuid, nome text, oab text, especialidade text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.nome, a.oab, a.especialidade
  FROM public.advogados a
  WHERE a.ativo = true
  ORDER BY a.nome;
$$;

REVOKE ALL ON FUNCTION public.list_advogadas_publicas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_advogadas_publicas() TO authenticated;

-- 3. Strengthen self-escalation trigger to also lock advogado_id after it's been set.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Not allowed to modify role';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Not allowed to modify status';
    END IF;
    -- Allow first-time linking (NULL -> value); block any later change.
    IF OLD.advogado_id IS NOT NULL
       AND NEW.advogado_id IS DISTINCT FROM OLD.advogado_id THEN
      RAISE EXCEPTION 'Not allowed to modify advogado_id once set';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
