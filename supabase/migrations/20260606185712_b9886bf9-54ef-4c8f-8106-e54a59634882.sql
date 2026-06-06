
-- 1. Drop policies, functions, and old table that block the refactor
DROP POLICY IF EXISTS "advogado reads clients" ON public.profiles;
DROP POLICY IF EXISTS "super admin reads all" ON public.profiles;
DROP POLICY IF EXISTS "super admin updates all profiles" ON public.profiles;
DROP POLICY IF EXISTS "owner all profile_data" ON public.profile_data;
DROP POLICY IF EXISTS "owner all onboarding" ON public.onboarding_responses;
DROP POLICY IF EXISTS "owner all queries" ON public.queries;
DROP POLICY IF EXISTS "owner all sessions" ON public.accompaniment_sessions;
DROP POLICY IF EXISTS "advogado manages own link" ON public.partner_links;

DROP TABLE IF EXISTS public.partner_links CASCADE;

DROP FUNCTION IF EXISTS public.get_my_advogado_contact() CASCADE;
DROP FUNCTION IF EXISTS public.get_minhas_clientes() CASCADE;
DROP FUNCTION IF EXISTS public.get_advogado_stats() CASCADE;
DROP FUNCTION IF EXISTS public.is_my_client(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_role_self_escalation() CASCADE;

-- 2. Convert role from enum to text (so we can freely use 'cliente'/'admin')
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'cliente';
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 3. Drop advogado_id (was pointing to profiles) + partner_code
ALTER TABLE public.profiles DROP COLUMN IF EXISTS advogado_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS partner_code;

-- 4. Normalize roles: only 'cliente' and 'admin'
UPDATE public.profiles SET role = 'admin'
  WHERE email = 'adv@jamaisenganada.com' OR role IN ('advogado','super_admin');
UPDATE public.profiles SET role = 'cliente'
  WHERE role NOT IN ('admin');

-- 5. Create advogados table
CREATE TABLE IF NOT EXISTS public.advogados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  oab text NOT NULL,
  whatsapp text NOT NULL,
  especialidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.advogados TO authenticated;
GRANT ALL ON public.advogados TO service_role;

ALTER TABLE public.advogados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advogados_read_active" ON public.advogados
  FOR SELECT TO authenticated USING (ativo = true);

CREATE POLICY "advogados_admin_all" ON public.advogados
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Add advogado_id back, now referencing advogados(id)
ALTER TABLE public.profiles
  ADD COLUMN advogado_id uuid REFERENCES public.advogados(id) ON DELETE SET NULL;

-- 7. Recreate is_admin helper + role-escalation guard
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed to modify privileged fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 8. Recreate dropped policies (without is_my_client, with admin override)
CREATE POLICY "admin reads all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "admin updates all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "owner all profile_data" ON public.profile_data
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "owner all onboarding" ON public.onboarding_responses
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "owner all queries" ON public.queries
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "owner all sessions" ON public.accompaniment_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 9. Seed Dra. Ana Lima
INSERT INTO public.advogados (nome, oab, whatsapp, especialidade)
SELECT 'Dra. Ana Lima', 'SP 123.456', '5511999990000', 'Direito de Família e da Mulher'
WHERE NOT EXISTS (SELECT 1 FROM public.advogados WHERE oab = 'SP 123.456');

-- 10. Link Juliana to the new lawyer record
UPDATE public.profiles
SET advogado_id = (SELECT id FROM public.advogados WHERE oab = 'SP 123.456' LIMIT 1)
WHERE email = 'teste@jamaisenganada.com';

-- 11. New simplified RPC for client's lawyer
CREATE OR REPLACE FUNCTION public.get_my_advogado_contact()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_advogado_id uuid;
  v_result json;
BEGIN
  SELECT advogado_id INTO v_advogado_id FROM public.profiles WHERE id = auth.uid();
  IF v_advogado_id IS NULL THEN RETURN NULL; END IF;

  SELECT json_build_object(
    'id', a.id,
    'nome', a.nome,
    'oab', a.oab,
    'whatsapp', a.whatsapp,
    'especialidade', a.especialidade
  ) INTO v_result
  FROM public.advogados a
  WHERE a.id = v_advogado_id AND a.ativo = true;

  RETURN v_result;
END;
$$;
