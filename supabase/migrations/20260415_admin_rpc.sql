-- Admin RPC functions for the Supabase-only frontend.
-- These functions keep platform-wide reads behind an is_admin check.

CREATE OR REPLACE FUNCTION public.current_app_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT is_admin
    FROM public.users
    WHERE id = public.current_app_user_id()
    LIMIT 1
  ), FALSE)
$$;

CREATE OR REPLACE FUNCTION public.require_app_admin()
RETURNS VOID
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_app_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS JSONB
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users INTEGER;
  v_admin_count INTEGER;
  v_total_jobs INTEGER;
  v_status_breakdown JSONB;
  v_recent_users JSONB;
  v_daily_signups JSONB;
BEGIN
  PERFORM public.require_app_admin();

  SELECT COUNT(*)::INTEGER, COUNT(*) FILTER (WHERE is_admin)::INTEGER
  INTO v_total_users, v_admin_count
  FROM public.users
  WHERE email <> 'demo@afavers.com';

  SELECT COUNT(*)::INTEGER INTO v_total_jobs FROM public.jobs;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', count) ORDER BY count DESC), '[]'::jsonb)
  INTO v_status_breakdown
  FROM (
    SELECT uj.status, COUNT(*)::INTEGER AS count
    FROM public.user_jobs uj
    JOIN public.users u ON u.id = uj.user_id
    WHERE u.email <> 'demo@afavers.com'
    GROUP BY uj.status
  ) rows;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_recent_users
  FROM (
    SELECT id, email, created_at
    FROM public.users
    WHERE email <> 'demo@afavers.com'
    ORDER BY created_at DESC
    LIMIT 5
  ) rows;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', count) ORDER BY day ASC), '[]'::jsonb)
  INTO v_daily_signups
  FROM (
    SELECT DATE(created_at)::TEXT AS day, COUNT(*)::INTEGER AS count
    FROM public.users
    WHERE email <> 'demo@afavers.com'
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  ) rows;

  RETURN jsonb_build_object(
    'totalUsers', v_total_users,
    'adminCount', v_admin_count,
    'totalJobs', v_total_jobs,
    'statusBreakdown', v_status_breakdown,
    'recentUsers', v_recent_users,
    'dailySignups', v_daily_signups
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users(p_page INTEGER DEFAULT 1, p_search TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER := 20;
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_search TEXT := COALESCE(NULLIF(TRIM(p_search), ''), '');
  v_total INTEGER;
  v_users JSONB;
BEGIN
  PERFORM public.require_app_admin();

  SELECT COUNT(*)::INTEGER
  INTO v_total
  FROM public.users
  WHERE email <> 'demo@afavers.com'
    AND (v_search = '' OR email ILIKE '%' || v_search || '%');

  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_users
  FROM (
    SELECT
      u.created_at,
      jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'isAdmin', u.is_admin,
        'createdAt', u.created_at,
        'jobCount', COUNT(uj.id)::INTEGER,
        'appliedCount', COUNT(uj.id) FILTER (WHERE uj.status IN ('applied', 'followup', 'interviewing', 'offered'))::INTEGER
      ) AS row_data
    FROM public.users u
    LEFT JOIN public.user_jobs uj ON uj.user_id = u.id
    WHERE u.email <> 'demo@afavers.com'
      AND (v_search = '' OR u.email ILIKE '%' || v_search || '%')
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT v_limit OFFSET (v_page - 1) * v_limit
  ) rows;

  RETURN jsonb_build_object(
    'users', v_users,
    'total', v_total,
    'page', v_page,
    'totalPages', GREATEST(CEIL(v_total::NUMERIC / v_limit)::INTEGER, 1)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_job_stats()
RETURNS JSONB
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_jobs INTEGER;
  v_by_source JSONB;
  v_by_status JSONB;
  v_recent_fetches JSONB;
BEGIN
  PERFORM public.require_app_admin();

  SELECT COUNT(*)::INTEGER INTO v_total_jobs FROM public.jobs;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'count', count) ORDER BY count DESC), '[]'::jsonb)
  INTO v_by_source
  FROM (
    SELECT COALESCE(source, 'unknown') AS source, COUNT(*)::INTEGER AS count
    FROM public.jobs
    GROUP BY COALESCE(source, 'unknown')
  ) rows;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', count) ORDER BY count DESC), '[]'::jsonb)
  INTO v_by_status
  FROM (
    SELECT status, COUNT(*)::INTEGER AS count
    FROM public.user_jobs
    GROUP BY status
  ) rows;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'count', count) ORDER BY day DESC), '[]'::jsonb)
  INTO v_recent_fetches
  FROM (
    SELECT DATE(created_at)::TEXT AS day, COUNT(*)::INTEGER AS count
    FROM public.jobs
    WHERE created_at >= NOW() - INTERVAL '14 days'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) DESC
    LIMIT 14
  ) rows;

  RETURN jsonb_build_object(
    'totalJobs', v_total_jobs,
    'bySource', v_by_source,
    'byStatus', v_by_status,
    'recentFetches', v_recent_fetches
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_messages()
RETURNS JSONB
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages JSONB;
  v_unread_count INTEGER;
BEGIN
  PERFORM public.require_app_admin();

  SELECT COUNT(*)::INTEGER INTO v_unread_count
  FROM public.contact_messages
  WHERE is_read = FALSE;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'email', email,
    'subject', subject,
    'message', message,
    'is_read', is_read,
    'created_at', created_at
  ) ORDER BY created_at DESC), '[]'::jsonb)
  INTO v_messages
  FROM public.contact_messages;

  RETURN jsonb_build_object('messages', v_messages, 'unreadCount', v_unread_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_message_read(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_app_admin();
  UPDATE public.contact_messages SET is_read = TRUE WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_message(p_id INTEGER)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_app_admin();
  DELETE FROM public.contact_messages WHERE id = p_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_admin(p_user_id INTEGER)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_id INTEGER;
  v_row public.users%ROWTYPE;
BEGIN
  PERFORM public.require_app_admin();
  v_current_id := public.current_app_user_id();
  IF p_user_id = v_current_id THEN
    RAISE EXCEPTION 'Cannot modify your own admin status' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
  SET is_admin = NOT is_admin
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'isAdmin', v_row.is_admin);
END;
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

GRANT EXECUTE ON FUNCTION public.current_app_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_app_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_job_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_message_read(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_message(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_admin(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(INTEGER) TO authenticated;
