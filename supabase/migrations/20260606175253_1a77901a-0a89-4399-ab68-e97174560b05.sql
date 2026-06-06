ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS queries_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS queries_limit integer NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS perfil_generations_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS perfil_generations_limit integer NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'base';

UPDATE public.profiles
SET queries_used = 0,
    queries_limit = 5,
    perfil_generations_used = 1,
    perfil_generations_limit = 2,
    plan_type = 'base'
WHERE email = 'teste@jamaisenganada.com';