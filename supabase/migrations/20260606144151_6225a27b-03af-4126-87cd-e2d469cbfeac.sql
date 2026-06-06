DELETE FROM public.onboarding_responses WHERE user_id = (SELECT id FROM public.profiles WHERE email='teste@jamaisenganada.com');
DELETE FROM public.profile_data WHERE user_id = (SELECT id FROM public.profiles WHERE email='teste@jamaisenganada.com');
UPDATE public.profiles SET full_name = NULL WHERE email='teste@jamaisenganada.com';