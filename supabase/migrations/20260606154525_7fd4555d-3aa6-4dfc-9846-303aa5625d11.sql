ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;

CREATE OR REPLACE FUNCTION public.get_my_advogado_contact()
RETURNS TABLE(full_name text, whatsapp text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.full_name, a.whatsapp
  FROM public.profiles c
  JOIN public.profiles a ON a.id = c.advogado_id
  WHERE c.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_advogado_contact() TO authenticated;