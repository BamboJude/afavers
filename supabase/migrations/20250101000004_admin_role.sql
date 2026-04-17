-- Admin flag on users. Used by admin RPC functions in 20260415_admin_rpc.sql.
-- Ported from server/src/db/migrations/008_admin_role.sql.
-- NOTE: Unlike the retired Express version, we do NOT hard-seed an admin row here.
-- Promote an admin explicitly via SQL after sign-up:
--   UPDATE public.users SET is_admin = TRUE WHERE email = 'you@example.com';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
