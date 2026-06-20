ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles SET role='admin', status='ativo', full_name=COALESCE(NULLIF(full_name,''),'Juliana (Admin)') WHERE id='6bc75c56-bb66-42b8-b738-dba7fff43afb';
ALTER TABLE public.profiles ENABLE TRIGGER USER;