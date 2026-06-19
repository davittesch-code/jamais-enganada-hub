
-- Pagamentos history
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  produto text NOT NULL,
  valor numeric NOT NULL,
  paddle_transaction_id text UNIQUE,
  status text NOT NULL DEFAULT 'completo',
  environment text NOT NULL DEFAULT 'sandbox',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagamentos_admin_select" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_pagamentos_email ON public.pagamentos(email);
CREATE INDEX IF NOT EXISTS idx_pagamentos_created ON public.pagamentos(created_at DESC);

-- Save Paddle product ids in configuracoes
INSERT INTO public.configuracoes (chave, valor) VALUES
  ('paddle_produto_acesso', 'acesso_jamais_enganada'),
  ('paddle_produto_recarga', 'recarga_jamais_enganada'),
  ('paddle_price_acesso', 'acesso_jamais_enganada'),
  ('paddle_price_recarga', 'recarga_jamais_enganada')
ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor;

-- Stats RPC for admin payments page
CREATE OR REPLACE FUNCTION public.get_pagamentos_stats()
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
    'total_recebido', COALESCE((SELECT SUM(valor) FROM pagamentos WHERE status='completo'), 0),
    'total_acessos', (SELECT COUNT(*) FROM pagamentos WHERE produto='acesso' AND status='completo'),
    'total_recargas', (SELECT COUNT(*) FROM pagamentos WHERE produto='recarga' AND status='completo'),
    'total_geral', (SELECT COUNT(*) FROM pagamentos WHERE status='completo')
  ) INTO v;
  RETURN v;
END; $$;
