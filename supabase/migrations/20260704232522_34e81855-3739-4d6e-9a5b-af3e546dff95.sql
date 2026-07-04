CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_team(_name text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE new_id UUID; norm TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _name IS NULL OR btrim(_name) = '' THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF _password !~ '^\d{4,6}$' THEN RAISE EXCEPTION 'invalid_password'; END IF;
  norm := lower(btrim(_name));
  IF EXISTS(SELECT 1 FROM public.teams WHERE name_normalized = norm) THEN
    RAISE EXCEPTION 'team_exists';
  END IF;
  INSERT INTO public.teams(name, name_normalized, password_hash)
    VALUES (btrim(_name), norm, extensions.crypt(_password, extensions.gen_salt('bf')))
    RETURNING id INTO new_id;
  UPDATE public.profiles SET team_id = new_id, updated_at = now() WHERE id = auth.uid();
  RETURN new_id;
END $function$;

CREATE OR REPLACE FUNCTION public.join_team(_name text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE t_id UUID; t_hash TEXT; norm TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  norm := lower(btrim(_name));
  SELECT id, password_hash INTO t_id, t_hash FROM public.teams WHERE name_normalized = norm;
  IF t_id IS NULL THEN RAISE EXCEPTION 'team_not_found'; END IF;
  IF t_hash <> extensions.crypt(_password, t_hash) THEN RAISE EXCEPTION 'invalid_password'; END IF;
  UPDATE public.profiles SET team_id = t_id, updated_at = now() WHERE id = auth.uid();
  RETURN t_id;
END $function$;