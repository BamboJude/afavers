-- Bridge the integer users table to Supabase Auth and enable row-level security.
-- Ported from server/src/db/migrations/011_supabase_auth_rls.sql with two deliberate changes:
--  1. `public.current_app_user_id()` is NOT defined here. The authoritative definition
--     lives in 20260415_tracker_private_manual_jobs.sql (it resolves via `auth.jwt() ->> 'email'`).
--  2. `public.public_jobs` view is NOT defined here. The authoritative version is
--     redefined in 20260415_tracker_private_manual_jobs.sql to exclude `owner_user_id` rows.
--  3. The permissive `jobs_select_authenticated` policy (USING true) is NOT created here.
--     The restrictive owner-aware variant is installed in 20260415_tracker_private_manual_jobs.sql.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND lower(u.email) = lower(au.email);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (email, password_hash, auth_user_id)
  VALUES (NEW.email, 'supabase-auth', NEW.id)
  ON CONFLICT (email) DO UPDATE
    SET auth_user_id = COALESCE(public.users.auth_user_id, EXCLUDED.auth_user_id);

  INSERT INTO public.user_settings (user_id)
  SELECT id FROM public.users WHERE auth_user_id = NEW.id
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TABLE IF NOT EXISTS public.werkstudent_saved (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refnr       VARCHAR(50) NOT NULL,
  title       TEXT NOT NULL,
  company     TEXT NOT NULL,
  location    TEXT NOT NULL,
  url         TEXT NOT NULL,
  posted_date TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'saved',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, refnr)
);

CREATE INDEX IF NOT EXISTS idx_werkstudent_saved_user ON public.werkstudent_saved(user_id);

-- Provisional stub for current_app_user_id so the SELECT policies below validate.
-- It is immediately replaced in 20260415_tracker_private_manual_jobs.sql with the
-- authoritative auth.jwt()-based implementation.
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.werkstudent_saved ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id = public.current_app_user_id());

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = public.current_app_user_id())
  WITH CHECK (id = public.current_app_user_id());

DROP POLICY IF EXISTS user_jobs_own_all ON public.user_jobs;
CREATE POLICY user_jobs_own_all ON public.user_jobs
  FOR ALL TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS user_settings_own_all ON public.user_settings;
CREATE POLICY user_settings_own_all ON public.user_settings
  FOR ALL TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS werkstudent_saved_own_all ON public.werkstudent_saved;
CREATE POLICY werkstudent_saved_own_all ON public.werkstudent_saved
  FOR ALL TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS xp_events_own_select ON public.xp_events;
CREATE POLICY xp_events_own_select ON public.xp_events
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS user_gamification_own_select ON public.user_gamification;
CREATE POLICY user_gamification_own_select ON public.user_gamification
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS missions_own_select ON public.missions;
CREATE POLICY missions_own_select ON public.missions
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS achievements_own_select ON public.achievements;
CREATE POLICY achievements_own_select ON public.achievements
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());
