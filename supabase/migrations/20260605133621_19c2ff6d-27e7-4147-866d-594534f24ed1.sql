
-- 1. New secure helpers (no arbitrary user_id parameter)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'::app_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_my_client(_row_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _row_user_id AND advogado_id = auth.uid()
  )
$$;

-- Restrict execute to authenticated only
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_my_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_client(uuid) TO authenticated;

-- 2. Drop dependent policies, then old functions, then recreate policies
DROP POLICY IF EXISTS "advogado manages own link" ON public.partner_links;
DROP POLICY IF EXISTS "super admin reads all" ON public.profiles;
DROP POLICY IF EXISTS "super admin updates all profiles" ON public.profiles;
DROP POLICY IF EXISTS "owner all profile_data" ON public.profile_data;
DROP POLICY IF EXISTS "owner all onboarding" ON public.onboarding_responses;
DROP POLICY IF EXISTS "owner all queries" ON public.queries;
DROP POLICY IF EXISTS "owner all sessions" ON public.accompaniment_sessions;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;

DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_advogado_id(uuid);

-- 3. Recreate policies with secure helpers
CREATE POLICY "advogado manages own link" ON public.partner_links
  FOR ALL TO authenticated
  USING (advogado_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (advogado_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "super admin reads all" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "super admin updates all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "owner all profile_data" ON public.profile_data
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_my_client(user_id) OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner all onboarding" ON public.onboarding_responses
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_my_client(user_id) OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner all queries" ON public.queries
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_my_client(user_id) OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner all sessions" ON public.accompaniment_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_my_client(user_id) OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid());

-- 4. Prevent privilege escalation: trigger blocks self-update of role / advogado_id
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.advogado_id IS DISTINCT FROM OLD.advogado_id
      OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Not allowed to modify privileged fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- Recreate the user self-update policy (role/advogado_id changes are blocked by trigger above)
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
