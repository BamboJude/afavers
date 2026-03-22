import { pool } from '../config/database.js';

// Inline SQL so it survives TypeScript compilation (no file copying needed)
const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '009_gamification',
    sql: `
      CREATE TABLE IF NOT EXISTS xp_events (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action     VARCHAR(50) NOT NULL,
        xp         INTEGER NOT NULL,
        job_id     INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
        metadata   JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_xp_events_user_id   ON xp_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS user_gamification (
        user_id              INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_xp             INTEGER NOT NULL DEFAULT 0,
        level                INTEGER NOT NULL DEFAULT 1,
        app_streak_current   INTEGER NOT NULL DEFAULT 0,
        app_streak_best      INTEGER NOT NULL DEFAULT 0,
        app_streak_last_date DATE,
        total_applications   INTEGER NOT NULL DEFAULT 0,
        total_interviews     INTEGER NOT NULL DEFAULT 0,
        total_offers         INTEGER NOT NULL DEFAULT 0,
        total_follow_ups     INTEGER NOT NULL DEFAULT 0,
        last_seen_at         TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS missions (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type         VARCHAR(50) NOT NULL,
        title        VARCHAR(200) NOT NULL,
        description  TEXT,
        target       INTEGER NOT NULL,
        progress     INTEGER NOT NULL DEFAULT 0,
        xp_reward    INTEGER NOT NULL,
        status       VARCHAR(20) NOT NULL DEFAULT 'active',
        week_start   DATE NOT NULL,
        expires_at   TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_missions_user_week ON missions(user_id, week_start, status);

      CREATE TABLE IF NOT EXISTS achievements (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        VARCHAR(50) NOT NULL,
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        xp_bonus    INTEGER NOT NULL DEFAULT 0,
        unlocked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, type)
      );
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const { name, sql } of MIGRATIONS) {
    const already = await pool.query(
      `SELECT 1 FROM schema_migrations WHERE name = $1`,
      [name],
    );
    if (already.rowCount && already.rowCount > 0) continue;

    await pool.query(sql);
    await pool.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [name]);
    console.log(`✅ Migration applied: ${name}`);
  }
}
