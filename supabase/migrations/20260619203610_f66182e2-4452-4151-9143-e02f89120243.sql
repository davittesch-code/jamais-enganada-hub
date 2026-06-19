
-- 1) Add CPF and phone to profiles (collected at checkout, reused for recarga)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS telefone text;

-- 2) Add Asaas-specific columns to pagamentos (keep paddle column for legacy data)
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS parcelas integer;

-- Make paddle_transaction_id nullable (was already nullable, just ensuring)
-- Add unique constraint on asaas_payment_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_asaas_payment_id_key
  ON public.pagamentos(asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;
