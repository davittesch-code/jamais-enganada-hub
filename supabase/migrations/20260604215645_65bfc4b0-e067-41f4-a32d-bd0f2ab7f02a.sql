
-- App roles enum
CREATE TYPE public.app_role AS ENUM ('cliente', 'advogado', 'super_admin');

-- =======================
-- PROFILES
-- =======================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role public.app_role NOT NULL DEFAULT 'cliente',
  partner_code TEXT,
  advogado_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_advogado_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT advogado_id FROM public.profiles WHERE id = _user_id
$$;

-- Profile policies
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "advogado reads clients" ON public.profiles
  FOR SELECT TO authenticated USING (advogado_id = auth.uid());
CREATE POLICY "super admin reads all" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "super admin updates all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'cliente',
    'pendente'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =======================
-- PARTNER LINKS
-- =======================
CREATE TABLE public.partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  commission_percent NUMERIC NOT NULL DEFAULT 20,
  total_clients INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_links TO authenticated;
GRANT ALL ON public.partner_links TO service_role;
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advogado manages own link" ON public.partner_links
  FOR ALL TO authenticated
  USING (advogado_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (advogado_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- =======================
-- ONBOARDING RESPONSES
-- =======================
CREATE TABLE public.onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_responses TO authenticated;
GRANT ALL ON public.onboarding_responses TO service_role;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all onboarding" ON public.onboarding_responses
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_advogado_id(user_id) = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (user_id = auth.uid());

-- =======================
-- PROFILE DATA
-- =======================
CREATE TABLE public.profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  areas JSONB DEFAULT '{}'::jsonb,
  insights JSONB DEFAULT '[]'::jsonb,
  attention_points JSONB DEFAULT '[]'::jsonb,
  next_steps JSONB DEFAULT '[]'::jsonb,
  radar_scores JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_data TO authenticated;
GRANT ALL ON public.profile_data TO service_role;
ALTER TABLE public.profile_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all profile_data" ON public.profile_data
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_advogado_id(user_id) = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (user_id = auth.uid());

-- =======================
-- QUERIES
-- =======================
CREATE TABLE public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.queries TO authenticated;
GRANT ALL ON public.queries TO service_role;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all queries" ON public.queries
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_advogado_id(user_id) = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (user_id = auth.uid());

-- =======================
-- ACCOMPANIMENT SESSIONS
-- =======================
CREATE TABLE public.accompaniment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  area TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accompaniment_sessions TO authenticated;
GRANT ALL ON public.accompaniment_sessions TO service_role;
ALTER TABLE public.accompaniment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner all sessions" ON public.accompaniment_sessions
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_advogado_id(user_id) = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_profile_data BEFORE UPDATE ON public.profile_data
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_accompaniment_sessions BEFORE UPDATE ON public.accompaniment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
