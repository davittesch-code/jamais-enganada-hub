
-- ============ suporte_notas ============
CREATE TABLE IF NOT EXISTS public.suporte_notas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nota text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suporte_notas TO authenticated;
GRANT ALL ON public.suporte_notas TO service_role;

ALTER TABLE public.suporte_notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suporte_admin" ON public.suporte_notas;
CREATE POLICY "suporte_admin" ON public.suporte_notas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS suporte_notas_cliente_idx ON public.suporte_notas(cliente_id, created_at DESC);

-- ============ configuracoes ============
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text UNIQUE NOT NULL,
  valor text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_admin" ON public.configuracoes;
CREATE POLICY "config_admin" ON public.configuracoes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS touch_configuracoes ON public.configuracoes;
CREATE TRIGGER touch_configuracoes BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.configuracoes (chave, valor) VALUES
  ('preco_base', '79.90'),
  ('preco_upsell', '29.90'),
  ('whatsapp_suporte', '5511999999999'),
  ('asaas_api_key', '')
ON CONFLICT (chave) DO NOTHING;

-- ============ RPC: get_admin_stats ============
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'total_clientes',       (SELECT COUNT(*) FROM profiles WHERE role='cliente'),
    'clientes_ativas',      (SELECT COUNT(*) FROM profiles WHERE role='cliente' AND status='ativo'),
    'clientes_pendentes',   (SELECT COUNT(*) FROM profiles WHERE role='cliente' AND status='pendente'),
    'perfis_gerados',       (SELECT COUNT(*) FROM profile_data),
    'total_advogados',      (SELECT COUNT(*) FROM advogados WHERE ativo=true),
    'vulnerabilidade_alta', (SELECT COUNT(*) FROM profile_data WHERE extra_data->>'nivel_vulnerabilidade'='alto'),
    'consultas_hoje',       (SELECT COUNT(*) FROM queries WHERE created_at > now() - interval '24 hours')
  ) INTO v;
  RETURN v;
END; $$;

REVOKE ALL ON FUNCTION public.get_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- ============ RPC: get_all_clientes ============
CREATE OR REPLACE FUNCTION public.get_all_clientes()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  status text,
  created_at timestamptz,
  queries_used int,
  queries_limit int,
  perfil_generations_used int,
  perfil_generations_limit int,
  tem_perfil boolean,
  nivel_vulnerabilidade text,
  advogado_id uuid,
  advogado_nome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.status,
    p.created_at,
    p.queries_used,
    p.queries_limit,
    p.perfil_generations_used,
    p.perfil_generations_limit,
    EXISTS(SELECT 1 FROM profile_data pd WHERE pd.user_id = p.id) AS tem_perfil,
    COALESCE(
      (SELECT pd.extra_data->>'nivel_vulnerabilidade' FROM profile_data pd WHERE pd.user_id = p.id),
      'nao_gerado'
    ) AS nivel_vulnerabilidade,
    p.advogado_id,
    COALESCE((SELECT a.nome FROM advogados a WHERE a.id = p.advogado_id), '—') AS advogado_nome
  FROM profiles p
  WHERE p.role = 'cliente'
  ORDER BY p.created_at DESC;
END; $$;

REVOKE ALL ON FUNCTION public.get_all_clientes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_clientes() TO authenticated;
