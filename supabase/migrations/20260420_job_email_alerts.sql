-- Priority job email alerts.
-- Users can opt in to email digests for high-match new jobs without receiving
-- the same job twice for the same alert.

CREATE TABLE IF NOT EXISTS public.job_alerts (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Priority job alert',
  keywords     TEXT NOT NULL DEFAULT '',
  locations    TEXT NOT NULL DEFAULT '',
  min_score    INTEGER NOT NULL DEFAULT 70 CHECK (min_score BETWEEN 0 AND 100),
  frequency    TEXT NOT NULL DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily')),
  enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  last_sent_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_alerts_user_id ON public.job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_job_alerts_enabled ON public.job_alerts(enabled) WHERE enabled = TRUE;

CREATE TABLE IF NOT EXISTS public.job_alert_deliveries (
  id         BIGSERIAL PRIMARY KEY,
  alert_id   INTEGER NOT NULL REFERENCES public.job_alerts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id     INTEGER NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(alert_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_alert_deliveries_user_id ON public.job_alert_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_job_alert_deliveries_job_id ON public.job_alert_deliveries(job_id);

DROP TRIGGER IF EXISTS update_job_alerts_updated_at ON public.job_alerts;
CREATE TRIGGER update_job_alerts_updated_at
  BEFORE UPDATE ON public.job_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alert_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_alerts_own_all ON public.job_alerts;
CREATE POLICY job_alerts_own_all ON public.job_alerts
  FOR ALL TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS job_alert_deliveries_own_select ON public.job_alert_deliveries;
CREATE POLICY job_alert_deliveries_own_select ON public.job_alert_deliveries
  FOR SELECT TO authenticated
  USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS job_alert_deliveries_service_only ON public.job_alert_deliveries;
CREATE POLICY job_alert_deliveries_service_only ON public.job_alert_deliveries
  AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);
