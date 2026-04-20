-- Corrective migration for review findings in already-applied environments.
-- Keeps fresh installs safe even if some earlier review-era files were run.

DROP POLICY IF EXISTS users_update_own ON public.users;
REVOKE UPDATE ON public.users FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
  ) THEN
    EXECUTE 'ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS password_reset_tokens_deny_all ON public.password_reset_tokens';
    EXECUTE $policy$
      CREATE POLICY password_reset_tokens_deny_all ON public.password_reset_tokens
        AS RESTRICTIVE
        FOR ALL
        TO anon, authenticated
        USING (false)
        WITH CHECK (false)
    $policy$;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id INTEGER)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_id INTEGER;
  v_target public.users%ROWTYPE;
BEGIN
  PERFORM public.require_app_admin();
  v_current_id := public.current_app_user_id();
  IF p_user_id = v_current_id THEN
    RAISE EXCEPTION 'Cannot delete your own account from admin panel' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_target.auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users
    WHERE id = v_target.auth_user_id;
  ELSE
    DELETE FROM auth.users
    WHERE lower(email) = lower(v_target.email);
  END IF;

  DELETE FROM public.users
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(INTEGER) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_namespace n
    JOIN pg_class c ON c.relnamespace = n.oid
    WHERE n.nspname = 'cron'
      AND c.relname = 'job'
  ) THEN
    EXECUTE $cleanup$
      SELECT cron.unschedule(jobname)
      FROM cron.job
      WHERE jobname = 'fetch-jobs-every-2-hours'
        AND command LIKE ANY (ARRAY[
          '%' || 'YOUR-' || 'PROJECT-REF' || '%',
          '%' || 'YOUR_' || 'CRON_SECRET' || '%'
        ])
    $cleanup$;
  END IF;
END
$$;
