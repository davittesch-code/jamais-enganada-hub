-- 1a: Campos profissionais
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS oab_number text,
ADD COLUMN IF NOT EXISTS especialidade text,
ADD COLUMN IF NOT EXISTS escritorio_nome text,
ADD COLUMN IF NOT EXISTS bio text;

-- 1b: Perfil da advogada teste (se o auth user existir)
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'adv@jamaisenganada.com';
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, full_name, email, role,
      whatsapp, oab_number, especialidade,
      escritorio_nome, partner_code, status
    ) VALUES (
      v_uid, 'Dra. Ana Lima', 'adv@jamaisenganada.com', 'advogado',
      '5511999990000', 'SP 123.456', 'Direito de Família e da Mulher',
      'Lima & Associadas', 'dra-ana-lima', 'ativo'
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'advogado',
      full_name = 'Dra. Ana Lima',
      whatsapp = '5511999990000',
      oab_number = 'SP 123.456',
      especialidade = 'Direito de Família e da Mulher',
      escritorio_nome = 'Lima & Associadas',
      partner_code = 'dra-ana-lima',
      status = 'ativo';

    INSERT INTO public.partner_links (
      advogado_id, code, commission_percent, total_clients, total_revenue
    ) VALUES (v_uid, 'dra-ana-lima', 20, 0, 0)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
    SET advogado_id = v_uid, partner_code = 'dra-ana-lima'
    WHERE email = 'teste@jamaisenganada.com';
  END IF;
END $$;

-- 1e: Atualizar RPC get_my_advogado_contact
DROP FUNCTION IF EXISTS public.get_my_advogado_contact();
CREATE OR REPLACE FUNCTION public.get_my_advogado_contact()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advogado_id uuid;
  v_result json;
BEGIN
  SELECT advogado_id INTO v_advogado_id FROM profiles WHERE id = auth.uid();
  IF v_advogado_id IS NULL THEN RETURN NULL; END IF;

  SELECT json_build_object(
    'id', p.id,
    'nome', p.full_name,
    'whatsapp', p.whatsapp,
    'oab_number', p.oab_number,
    'especialidade', p.especialidade,
    'escritorio_nome', p.escritorio_nome,
    'bio', p.bio,
    'partner_code', p.partner_code
  ) INTO v_result FROM profiles p WHERE p.id = v_advogado_id;

  RETURN v_result;
END;
$$;

-- 1f: Advogado lista suas clientes
CREATE OR REPLACE FUNCTION public.get_minhas_clientes()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  status text,
  created_at timestamptz,
  queries_used integer,
  queries_limit integer,
  perfil_generations_used integer,
  tem_perfil boolean,
  nivel_vulnerabilidade text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.full_name, p.email, p.status, p.created_at,
    p.queries_used, p.queries_limit, p.perfil_generations_used,
    EXISTS(SELECT 1 FROM profile_data pd WHERE pd.user_id = p.id) AS tem_perfil,
    COALESCE(
      (SELECT pd.extra_data->>'nivel_vulnerabilidade'
       FROM profile_data pd WHERE pd.user_id = p.id),
      'nao_gerado'
    ) AS nivel_vulnerabilidade
  FROM profiles p
  WHERE p.advogado_id = auth.uid() AND p.role = 'cliente'
  ORDER BY p.created_at DESC;
END;
$$;

-- 1g: Stats do painel
CREATE OR REPLACE FUNCTION public.get_advogado_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result json;
BEGIN
  SELECT json_build_object(
    'total_clientes', COUNT(*),
    'clientes_ativos', COUNT(*) FILTER (WHERE p.status = 'ativo'),
    'com_perfil', COUNT(*) FILTER (
      WHERE EXISTS(SELECT 1 FROM profile_data pd WHERE pd.user_id = p.id)
    ),
    'vulnerabilidade_alta', COUNT(*) FILTER (
      WHERE EXISTS(
        SELECT 1 FROM profile_data pd
        WHERE pd.user_id = p.id
          AND pd.extra_data->>'nivel_vulnerabilidade' = 'alto'
      )
    )
  ) INTO v_result
  FROM profiles p
  WHERE p.advogado_id = auth.uid() AND p.role = 'cliente';

  RETURN v_result;
END;
$$;