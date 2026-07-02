
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('captain','manager','staff','exec','member','student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Generic updated_at trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ===== teams =====
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== profiles =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Security definer helpers =====
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(_user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = _user AND role IN ('captain','manager','staff','exec')
  )
$$;

-- ===== Grants + RLS enable =====
GRANT SELECT ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- teams policies
CREATE POLICY "Members can view their team" ON public.teams FOR SELECT TO authenticated
  USING (id = public.get_my_team_id());

-- profiles policies
CREATE POLICY "View own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "View team members" ON public.profiles FOR SELECT TO authenticated
  USING (team_id IS NOT NULL AND team_id = public.get_my_team_id());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Delete own profile" ON public.profiles FOR DELETE TO authenticated
  USING (id = auth.uid());

-- ===== Auto-create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''),'@',1))
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== team_categories / team_event_types (defined before create_team seed fn) =====
CREATE TABLE public.team_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(team_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_categories TO authenticated;
GRANT ALL ON public.team_categories TO service_role;
ALTER TABLE public.team_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read categories" ON public.team_categories FOR SELECT TO authenticated
  USING (team_id = public.get_my_team_id());
CREATE POLICY "Leaders write categories" ON public.team_categories FOR ALL TO authenticated
  USING (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()))
  WITH CHECK (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));

CREATE TABLE public.team_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(team_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_event_types TO authenticated;
GRANT ALL ON public.team_event_types TO service_role;
ALTER TABLE public.team_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read event_types" ON public.team_event_types FOR SELECT TO authenticated
  USING (team_id = public.get_my_team_id());
CREATE POLICY "Leaders write event_types" ON public.team_event_types FOR ALL TO authenticated
  USING (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()))
  WITH CHECK (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));

-- Seed defaults
CREATE OR REPLACE FUNCTION public.seed_team_defaults(_team UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.team_categories(team_id, slug, label, sort_order) VALUES
    (_team,'top','トップチーム',0),(_team,'b','Bチーム',1),(_team,'c','Cチーム',2),
    (_team,'manager','マネージャー',3),(_team,'all','全員',4)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.team_event_types(team_id, label, sort_order) VALUES
    (_team,'イベント',0),(_team,'リーグ戦',1),(_team,'カップ戦',2),
    (_team,'練習試合',3),(_team,'練習',4),(_team,'朝練',5),
    (_team,'大会',6),(_team,'ミーティング',7),(_team,'その他',8)
  ON CONFLICT DO NOTHING;
END $$;
GRANT EXECUTE ON FUNCTION public.seed_team_defaults(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.on_team_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.seed_team_defaults(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER trg_team_created AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.on_team_created();

-- ===== Team create / join RPCs =====
CREATE OR REPLACE FUNCTION public.create_team(_name TEXT, _password TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    VALUES (btrim(_name), norm, crypt(_password, gen_salt('bf')))
    RETURNING id INTO new_id;
  UPDATE public.profiles SET team_id = new_id, updated_at = now() WHERE id = auth.uid();
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_team(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_team(_name TEXT, _password TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t_id UUID; t_hash TEXT; norm TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  norm := lower(btrim(_name));
  SELECT id, password_hash INTO t_id, t_hash FROM public.teams WHERE name_normalized = norm;
  IF t_id IS NULL THEN RAISE EXCEPTION 'team_not_found'; END IF;
  IF t_hash <> crypt(_password, t_hash) THEN RAISE EXCEPTION 'invalid_password'; END IF;
  UPDATE public.profiles SET team_id = t_id, updated_at = now() WHERE id = auth.uid();
  RETURN t_id;
END $$;
GRANT EXECUTE ON FUNCTION public.join_team(TEXT, TEXT) TO authenticated;

-- ===== events =====
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT '',
  categories TEXT[] NOT NULL DEFAULT '{}',
  opponent TEXT,
  event_date DATE NOT NULL,
  meeting_time TEXT,
  warmup_time TEXT,
  start_time TEXT,
  location TEXT,
  items TEXT,
  notes TEXT,
  rain_cancel BOOLEAN NOT NULL DEFAULT false,
  attendance_deadline TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read events" ON public.events FOR SELECT TO authenticated
  USING (team_id = public.get_my_team_id());
CREATE POLICY "Leaders insert events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));
CREATE POLICY "Leaders update events" ON public.events FOR UPDATE TO authenticated
  USING (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()))
  WITH CHECK (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));
CREATE POLICY "Leaders delete events" ON public.events FOR DELETE TO authenticated
  USING (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX events_team_date_idx ON public.events(team_id, event_date);

-- ===== attendance =====
CREATE TABLE public.attendance (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attend','absent','late')),
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read attendance" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.team_id = public.get_my_team_id()));
CREATE POLICY "Self insert attendance" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
    AND EXISTS(SELECT 1 FROM public.events e WHERE e.id = event_id AND e.team_id = public.get_my_team_id()));
CREATE POLICY "Self update attendance" ON public.attendance FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Self delete attendance" ON public.attendance FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== wakeups =====
CREATE TABLE public.wakeups (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  wake_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, wake_date, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wakeups TO authenticated;
GRANT ALL ON public.wakeups TO service_role;
ALTER TABLE public.wakeups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read wakeups" ON public.wakeups FOR SELECT TO authenticated
  USING (team_id = public.get_my_team_id());
CREATE POLICY "Self insert wakeup" ON public.wakeups FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND team_id = public.get_my_team_id());
CREATE POLICY "Self delete wakeup" ON public.wakeups FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ===== announcements =====
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "when" TEXT NOT NULL DEFAULT 'general',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT '',
  author_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (team_id = public.get_my_team_id());
CREATE POLICY "Leaders insert announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "Leaders delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));

-- ===== finance =====
CREATE TABLE public.finance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_items TO authenticated;
GRANT ALL ON public.finance_items TO service_role;
ALTER TABLE public.finance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read finance" ON public.finance_items FOR SELECT TO authenticated
  USING (team_id = public.get_my_team_id());
CREATE POLICY "Leaders insert finance" ON public.finance_items FOR INSERT TO authenticated
  WITH CHECK (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));
CREATE POLICY "Leaders update finance" ON public.finance_items FOR UPDATE TO authenticated
  USING (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()))
  WITH CHECK (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));
CREATE POLICY "Leaders delete finance" ON public.finance_items FOR DELETE TO authenticated
  USING (team_id = public.get_my_team_id() AND public.is_team_leader(auth.uid()));

CREATE TABLE public.finance_payments (
  item_id UUID NOT NULL REFERENCES public.finance_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_payments TO authenticated;
GRANT ALL ON public.finance_payments TO service_role;
ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team read payments" ON public.finance_payments FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.finance_items i WHERE i.id = item_id AND i.team_id = public.get_my_team_id()));
CREATE POLICY "Insert payment" ON public.finance_payments FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid() OR public.is_team_leader(auth.uid()))
    AND EXISTS(SELECT 1 FROM public.finance_items i WHERE i.id = item_id AND i.team_id = public.get_my_team_id()));
CREATE POLICY "Update payment" ON public.finance_payments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_team_leader(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_team_leader(auth.uid()));
CREATE POLICY "Leaders delete payment" ON public.finance_payments FOR DELETE TO authenticated
  USING (public.is_team_leader(auth.uid()));
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.finance_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.events, public.attendance, public.wakeups,
  public.announcements, public.finance_items, public.finance_payments,
  public.team_categories, public.team_event_types, public.profiles;
