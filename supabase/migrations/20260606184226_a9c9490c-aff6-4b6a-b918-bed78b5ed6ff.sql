
DO $$
DECLARE
  v_adv_id uuid;
  v_cli_id uuid;
BEGIN
  SELECT id INTO v_adv_id FROM auth.users WHERE email = 'adv@jamaisenganada.com';

  IF v_adv_id IS NULL THEN
    v_adv_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_adv_id, 'authenticated', 'authenticated',
      'adv@jamaisenganada.com',
      crypt('Adv@1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Dra. Ana Lima"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_adv_id,
      jsonb_build_object('sub', v_adv_id::text, 'email', 'adv@jamaisenganada.com', 'email_verified', true),
      'email', v_adv_id::text, now(), now(), now()
    );
  END IF;

  ALTER TABLE public.profiles DISABLE TRIGGER USER;

  UPDATE public.profiles
  SET role = 'advogado'::app_role,
      status = 'ativo',
      full_name = 'Dra. Ana Lima',
      whatsapp = COALESCE(NULLIF(whatsapp,''), '5511999990000'),
      oab_number = COALESCE(NULLIF(oab_number,''), 'SP 123456'),
      especialidade = COALESCE(NULLIF(especialidade,''), 'Direito de Família e da Mulher'),
      escritorio_nome = COALESCE(NULLIF(escritorio_nome,''), 'Lima Advocacia'),
      bio = COALESCE(NULLIF(bio,''), 'Advogada especializada em direitos da mulher, família e patrimônio.'),
      partner_code = COALESCE(NULLIF(partner_code,''), 'dra-ana-lima')
  WHERE id = v_adv_id;

  INSERT INTO public.partner_links (advogado_id, code, commission_percent, total_clients, total_revenue)
  VALUES (v_adv_id, 'dra-ana-lima', 20, 0, 0)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_cli_id FROM auth.users WHERE email = 'teste@jamaisenganada.com';
  IF v_cli_id IS NOT NULL THEN
    UPDATE public.profiles
    SET advogado_id = v_adv_id,
        partner_code = 'dra-ana-lima',
        status = CASE WHEN status = 'pendente' THEN 'ativo' ELSE status END
    WHERE id = v_cli_id;
  END IF;

  ALTER TABLE public.profiles ENABLE TRIGGER USER;
END $$;
