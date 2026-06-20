
-- Permitir mudanças de role/status/advogado_id quando rodando em contexto server-side
-- (service_role no webhook do Asaas) — nesse caso auth.uid() é NULL.
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role / chamadas internas (sem usuário autenticado) podem alterar tudo.
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to modify role';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not allowed to modify status';
  END IF;
  IF OLD.advogado_id IS NOT NULL
     AND NEW.advogado_id IS DISTINCT FROM OLD.advogado_id THEN
    RAISE EXCEPTION 'Not allowed to modify advogado_id once set';
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: ativar contas cujos pagamentos já foram confirmados mas ficaram presas em 'pendente'
UPDATE public.profiles p
SET status = 'ativo'
WHERE p.status = 'pendente'
  AND p.role = 'cliente'
  AND EXISTS (
    SELECT 1 FROM public.pagamentos pg
    WHERE lower(pg.email) = lower(p.email)
      AND pg.status = 'completo'
      AND pg.produto = 'acesso'
  );
