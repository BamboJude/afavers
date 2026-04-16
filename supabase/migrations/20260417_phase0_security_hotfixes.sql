-- Phase 0 security hotfixes — RUN IN THE LIVE SUPABASE SQL EDITOR.
-- Date: 2026-04-17
--
-- These statements cannot be safely encoded as app-side code; they mutate the
-- live production database. Review each block before running. Idempotent where
-- reasonable.

-- 0.4 — Resolve the duplicate `jobs_select_authenticated` policy.
-- The permissive `USING (true)` variant from 011_supabase_auth_rls.sql
-- conflicts with the owner-scoped variant from 20260415_tracker_private_manual_jobs.sql.
-- We drop both and recreate the owner-scoped one as the single source of truth.

DROP POLICY IF EXISTS jobs_select_authenticated ON public.jobs;

CREATE POLICY jobs_select_authenticated
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id IS NULL
    OR owner_user_id = public.current_app_user_id()
  );

-- Verify the policy is in place with the correct definition:
-- SELECT policyname, qual FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'jobs';

-- 0.2 — Delete the seeded default admin rows, if present.
-- Safe: these rows either do not exist or were created by the old migration 001
-- seed with an un-loginable bcrypt hash. Either way, real users should not
-- depend on these email addresses.

-- Preview first (does not delete):
-- SELECT id, email, is_admin, created_at FROM public.users
--   WHERE email IN ('admin@example.com', 'admin@afavers.com');

-- Execute deletion (uncomment after previewing the rows above):
-- DELETE FROM public.users
--   WHERE email IN ('admin@example.com', 'admin@afavers.com');

-- 0.4b — Confirm the admin user is the one YOU own.
-- After signing up through the web app, promote your account:
-- UPDATE public.users SET is_admin = TRUE WHERE email = 'YOUR_EMAIL@DOMAIN';
