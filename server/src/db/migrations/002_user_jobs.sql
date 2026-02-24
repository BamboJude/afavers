-- Per-user job tracking (status, notes, applied dates, hidden flag)
-- Each user maintains their own view of the shared job listings

CREATE TABLE IF NOT EXISTS user_jobs (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status          VARCHAR(50) NOT NULL DEFAULT 'new',
  notes           TEXT,
  applied_date    DATE,
  follow_up_date  DATE,
  is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_user_jobs_user_id     ON user_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_jobs_user_status ON user_jobs(user_id, status);
