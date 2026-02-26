import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL = 'demo@afavers.com';
const DEMO_PASSWORD = 'demo1234';

// Mix of statuses to seed — gives analytics something to show
const DEMO_STATUSES: Array<'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected'> = [
  'applied',
  'applied',
  'applied',
  'applied',
  'interviewing',
  'interviewing',
  'saved',
  'saved',
  'saved',
  'offered',
  'rejected',
  'rejected',
];

export async function getDemoUserId(): Promise<number | null> {
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
  return result.rows[0]?.id ?? null;
}

export async function ensureDemoUser(): Promise<number> {
  let id = await getDemoUserId();
  if (!id) {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const r = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [DEMO_EMAIL, hash]
    );
    id = r.rows[0].id;
    console.log(`[Demo] Created demo user id=${id}`);
  }
  return id;
}

export async function resetDemoData(): Promise<void> {
  try {
    const userId = await ensureDemoUser();

    // Wipe existing demo user_jobs
    await pool.query('DELETE FROM user_jobs WHERE user_id = $1', [userId]);

    // Grab recent jobs to seed
    const jobs = await pool.query(
      'SELECT id FROM jobs ORDER BY created_at DESC LIMIT $1',
      [DEMO_STATUSES.length + 5]
    );

    if (jobs.rows.length === 0) {
      console.log('[Demo] No jobs available to seed demo data — will retry later');
      return;
    }

    const picks = jobs.rows.slice(0, DEMO_STATUSES.length);

    for (let i = 0; i < picks.length; i++) {
      const status = DEMO_STATUSES[i];
      // Spread applied_dates over the last 30 days for realistic analytics
      const appliedDate = ['applied', 'interviewing', 'offered', 'rejected'].includes(status)
        ? new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        : null;

      await pool.query(
        `INSERT INTO user_jobs (user_id, job_id, status, applied_date, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, job_id) DO UPDATE SET
           status = EXCLUDED.status,
           applied_date = EXCLUDED.applied_date,
           updated_at = NOW()`,
        [userId, picks[i].id, status, appliedDate]
      );
    }

    console.log(`[Demo] Reset complete: ${picks.length} jobs seeded for user ${userId}`);
  } catch (error) {
    console.error('[Demo] Reset failed:', error);
  }
}
