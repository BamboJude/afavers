-- ── Gamification Schema ───────────────────────────────────────────────────────
-- XP events (append-only audit log — never mutate, always insert)
CREATE TABLE IF NOT EXISTS xp_events (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     VARCHAR(50) NOT NULL,
  -- 'apply' | 'follow_up' | 'interview' | 'offer' | 'save_job' | 'daily_login' | 'mission_complete'
  xp         INTEGER NOT NULL,
  job_id     INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_id   ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(user_id, created_at DESC);

-- ── User gamification state (denormalized for fast reads) ─────────────────────
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id              INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp             INTEGER NOT NULL DEFAULT 0,
  level                INTEGER NOT NULL DEFAULT 1,
  -- Application streak
  app_streak_current   INTEGER NOT NULL DEFAULT 0,
  app_streak_best      INTEGER NOT NULL DEFAULT 0,
  app_streak_last_date DATE,
  -- Lifetime counters (denormalized for mission generation)
  total_applications   INTEGER NOT NULL DEFAULT 0,
  total_interviews     INTEGER NOT NULL DEFAULT 0,
  total_offers         INTEGER NOT NULL DEFAULT 0,
  total_follow_ups     INTEGER NOT NULL DEFAULT 0,
  -- Meta
  last_seen_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── Weekly missions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  -- 'apply_n' | 'follow_up_n' | 'get_interview' | 'get_offer' | 'apply_daily_3'
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  target       INTEGER NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0,
  xp_reward    INTEGER NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'expired'
  week_start   DATE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_user_week
  ON missions(user_id, week_start, status);

-- ── Achievements (one-time milestones) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  -- 'first_save' | 'first_apply' | 'first_interview' | 'first_offer'
  -- 'apps_10' | 'apps_50' | 'apps_100'
  -- 'streak_7' | 'streak_30'
  -- 'follow_up_5' | 'interviews_5'
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  xp_bonus    INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
