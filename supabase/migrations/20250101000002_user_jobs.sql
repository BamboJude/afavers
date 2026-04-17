-- Per-user job tracking (status, notes, applied dates, hidden flag, cover letter, interview date).
-- Ported from server/src/db/migrations/002_user_jobs.sql and 005_cover_letter_interview_date.sql.

CREATE TABLE IF NOT EXISTS public.user_jobs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id          INTEGER NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status          VARCHAR(50) NOT NULL DEFAULT 'new',
  notes           TEXT,
  applied_date    DATE,
  follow_up_date  DATE,
  is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  cover_letter    TEXT,
  interview_date  DATE,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_user_jobs_user_id     ON public.user_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_jobs_user_status ON public.user_jobs(user_id, status);
