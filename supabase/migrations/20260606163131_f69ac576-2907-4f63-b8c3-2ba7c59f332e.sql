UPDATE public.profiles p
SET full_name = COALESCE(NULLIF(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1))
FROM auth.users u
WHERE p.id = u.id AND (p.full_name IS NULL OR p.full_name = '');