-- Drop legacy columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS queries_used,
  DROP COLUMN IF EXISTS queries_limit;

-- Recreate get_all_clientes returning the authoritative counters (consultas_*)
DROP FUNCTION IF EXISTS public.get_all_clientes();

CREATE OR REPLACE FUNCTION public.get_all_clientes()
 RETURNS TABLE(
   id uuid,
   full_name text,
   email text,
   status text,
   created_at timestamp with time zone,
   consultas_used integer,
   consultas_limit integer,
   perfil_generations_used integer,
   perfil_generations_limit integer,
   tem_perfil boolean,
   nivel_vulnerabilidade text,
   advogado_id uuid,
   advogado_nome text,
   plano_expira_em timestamp with time zone
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    p.consultas_used,
    p.consultas_limit,
    p.perfil_generations_used,
    p.perfil_generations_limit,
    EXISTS(SELECT 1 FROM profile_data pd WHERE pd.user_id = p.id) AS tem_perfil,
    COALESCE(
      (SELECT pd.extra_data->>'nivel_vulnerabilidade' FROM profile_data pd WHERE pd.user_id = p.id),
      'nao_gerado'
    ) AS nivel_vulnerabilidade,
    p.advogado_id,
    COALESCE((SELECT a.nome FROM advogados a WHERE a.id = p.advogado_id), '—') AS advogado_nome,
    p.plano_expira_em
  FROM profiles p
  WHERE p.role = 'cliente'
  ORDER BY p.created_at DESC;
END; $function$;