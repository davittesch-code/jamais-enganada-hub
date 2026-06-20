CREATE TABLE IF NOT EXISTS public.cadastros_pendentes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_payment_id text UNIQUE,
  nome text NOT NULL,
  email text NOT NULL,
  cpf text,
  telefone text,
  advogada_id uuid,
  tipo_produto text NOT NULL,
  processado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.cadastros_pendentes TO service_role;

ALTER TABLE public.cadastros_pendentes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS cadastros_pendentes_asaas_payment_id_idx
  ON public.cadastros_pendentes (asaas_payment_id);