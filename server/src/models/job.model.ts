import { pool } from '../config/database.js';
import { Job, JobFilters } from '../types/index.js';

/**
 * Find a job by its external ID (used by the fetcher)
 */
export async function findByExternalId(externalId: string): Promise<Job | null> {
  const result = await pool.query<Job>(
    'SELECT * FROM jobs WHERE external_id = $1',
    [externalId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new job (used by the fetcher — no user context)
 */
export async function create(jobData: Partial<Job>): Promise<Job> {
  const {
    external_id, title, company, location, description,
    url, source, posted_date, deadline, salary,
  } = jobData;

  const { language } = jobData;

  const result = await pool.query<Job>(
    `INSERT INTO jobs (
      external_id, title, company, location, description, url,
      source, posted_date, deadline, salary, language
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [external_id, title, company, location, description, url, source, posted_date, deadline, salary, language ?? null]
  );
  return result.rows[0];
}

/**
 * Update the core job record (title, description, etc.) — used by the fetcher
 */
export async function updateJobCore(id: number, updates: Partial<Job>): Promise<Job> {
  const allowed = ['title', 'company', 'location', 'description', 'url', 'posted_date', 'deadline', 'salary', 'language'];
  const fields: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (allowed.includes(key) && value !== undefined) {
      fields.push(`${key} = $${p++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) throw new Error('No fields to update');
  values.push(id);

  const result = await pool.query<Job>(
    `UPDATE jobs SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Upsert a user's tracking data for a specific job (status, notes, hide, dates)
 * Only the fields passed in `updates` are written.
 */
export async function upsertUserJob(
  userId: number,
  jobId: number,
  updates: {
    status?: string;
    notes?: string;
    applied_date?: Date | null;
    follow_up_date?: Date | null;
    is_hidden?: boolean;
  }
): Promise<void> {
  // Fetch existing row so we can merge
  const existing = await pool.query(
    'SELECT * FROM user_jobs WHERE user_id = $1 AND job_id = $2',
    [userId, jobId]
  );
  const current = existing.rows[0] || {};

  const status       = updates.status       !== undefined ? updates.status       : (current.status       ?? 'new');
  const notes        = updates.notes        !== undefined ? updates.notes        : (current.notes        ?? null);
  const applied_date = updates.applied_date !== undefined ? updates.applied_date : (current.applied_date ?? null);
  const follow_up    = updates.follow_up_date !== undefined ? updates.follow_up_date : (current.follow_up_date ?? null);
  const is_hidden    = updates.is_hidden    !== undefined ? updates.is_hidden    : (current.is_hidden    ?? false);

  await pool.query(
    `INSERT INTO user_jobs (user_id, job_id, status, notes, applied_date, follow_up_date, is_hidden, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id, job_id) DO UPDATE SET
       status        = EXCLUDED.status,
       notes         = EXCLUDED.notes,
       applied_date  = EXCLUDED.applied_date,
       follow_up_date= EXCLUDED.follow_up_date,
       is_hidden     = EXCLUDED.is_hidden,
       updated_at    = NOW()`,
    [userId, jobId, status, notes, applied_date, follow_up, is_hidden]
  );
}

/**
 * Find all jobs with user-specific status overlay.
 * All tracking columns (status, notes, etc.) come from user_jobs via LEFT JOIN.
 */
export async function findAll(filters?: JobFilters, userId?: number): Promise<Job[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  // userId param for the LEFT JOIN
  const userIdParam = userId ?? 0;
  values.push(userIdParam); // $1 = userId
  p++;

  if (filters?.source) {
    conditions.push(`j.source = $${p}`);
    values.push(filters.source);
    p++;
  }

  if (filters?.search) {
    conditions.push(`(
      j.title ILIKE $${p} OR
      j.company ILIKE $${p} OR
      j.location ILIKE $${p} OR
      j.description ILIKE $${p}
    )`);
    values.push(`%${filters.search}%`);
    p++;
  }

  if (filters?.status) {
    conditions.push(`COALESCE(uj.status, 'new') = $${p}`);
    values.push(filters.status);
    p++;
  }

  // Filter by user's search keywords (title or description must match at least one)
  if (filters?.userKeywords && filters.userKeywords.length > 0) {
    const patterns = filters.userKeywords.map(k => `%${k.trim()}%`);
    values.push(patterns);
    conditions.push(`(j.title ILIKE ANY($${p}) OR j.description ILIKE ANY($${p}))`);
    p++;
  }

  // Filter by user's target locations
  if (filters?.userLocations && filters.userLocations.length > 0) {
    const patterns = filters.userLocations.map(l => `%${l.trim()}%`);
    values.push(patterns);
    conditions.push(`j.location ILIKE ANY($${p})`);
    p++;
  }

  // Filter by language
  if (filters?.language) {
    conditions.push(`j.language = $${p}`);
    values.push(filters.language);
    p++;
  }

  // Always exclude hidden jobs
  conditions.push(`COALESCE(uj.is_hidden, FALSE) = FALSE`);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Whitelist sortBy to prevent SQL injection
  const allowedSortCols: Record<string, string> = {
    created_at: 'j.created_at',
    posted_date: 'j.posted_date',
    title: 'j.title',
    company: 'j.company',
  };
  const sortCol = allowedSortCols[filters?.sortBy || 'created_at'] || 'j.created_at';
  const sortOrder = filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const limit  = filters?.limit  || 50;
  const offset = filters?.offset || 0;

  const query = `
    SELECT
      j.id, j.external_id, j.title, j.company, j.location, j.description,
      j.url, j.source, j.posted_date, j.deadline, j.salary, j.language,
      j.created_at, j.updated_at,
      COALESCE(uj.status,    'new')   AS status,
      uj.notes,
      uj.applied_date,
      uj.follow_up_date,
      COALESCE(uj.is_hidden, FALSE)   AS is_hidden
    FROM jobs j
    LEFT JOIN user_jobs uj ON j.id = uj.job_id AND uj.user_id = $1
    ${whereClause}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const result = await pool.query<Job>(query, values);
  return result.rows;
}

/**
 * Count jobs matching filters for a given user
 */
export async function count(
  filters?: Pick<JobFilters, 'status' | 'source' | 'search' | 'userKeywords' | 'userLocations' | 'language'>,
  userId?: number
): Promise<number> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  const userIdParam = userId ?? 0;
  values.push(userIdParam); // $1
  p++;

  if (filters?.source) {
    conditions.push(`j.source = $${p}`);
    values.push(filters.source);
    p++;
  }

  if (filters?.search) {
    conditions.push(`(
      j.title ILIKE $${p} OR
      j.company ILIKE $${p} OR
      j.location ILIKE $${p} OR
      j.description ILIKE $${p}
    )`);
    values.push(`%${filters.search}%`);
    p++;
  }

  if (filters?.status) {
    conditions.push(`COALESCE(uj.status, 'new') = $${p}`);
    values.push(filters.status);
    p++;
  }

  if (filters?.userKeywords && filters.userKeywords.length > 0) {
    const patterns = filters.userKeywords.map(k => `%${k.trim()}%`);
    values.push(patterns);
    conditions.push(`(j.title ILIKE ANY($${p}) OR j.description ILIKE ANY($${p}))`);
    p++;
  }

  if (filters?.userLocations && filters.userLocations.length > 0) {
    const patterns = filters.userLocations.map(l => `%${l.trim()}%`);
    values.push(patterns);
    conditions.push(`j.location ILIKE ANY($${p})`);
    p++;
  }

  if (filters?.language) {
    conditions.push(`j.language = $${p}`);
    values.push(filters.language);
    p++;
  }

  conditions.push(`COALESCE(uj.is_hidden, FALSE) = FALSE`);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const query = `
    SELECT COUNT(*) AS count
    FROM jobs j
    LEFT JOIN user_jobs uj ON j.id = uj.job_id AND uj.user_id = $1
    ${whereClause}
  `;

  const result = await pool.query<{ count: string }>(query, values);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Find a single job with user-specific status overlay
 */
export async function findById(id: number, userId?: number): Promise<Job | null> {
  const userIdParam = userId ?? 0;
  const result = await pool.query<Job>(
    `SELECT
       j.id, j.external_id, j.title, j.company, j.location, j.description,
       j.url, j.source, j.posted_date, j.deadline, j.salary, j.language,
       j.created_at, j.updated_at,
       COALESCE(uj.status,    'new')  AS status,
       uj.notes,
       uj.applied_date,
       uj.follow_up_date,
       COALESCE(uj.is_hidden, FALSE)  AS is_hidden
     FROM jobs j
     LEFT JOIN user_jobs uj ON j.id = uj.job_id AND uj.user_id = $2
     WHERE j.id = $1`,
    [id, userIdParam]
  );
  return result.rows[0] || null;
}

/**
 * Get job counts per status for a specific user
 */
export async function getStats(
  userId?: number,
  userKeywords?: string[],
  userLocations?: string[]
): Promise<{
  total: number; new: number; saved: number; applied: number;
  interviewing: number; offered: number; rejected: number; new_today: number;
}> {
  const userIdParam = userId ?? 0;
  const values: unknown[] = [userIdParam];
  let p = 2;
  const whereConds: string[] = [];

  if (userKeywords && userKeywords.length > 0) {
    const patterns = userKeywords.map(k => `%${k.trim()}%`);
    values.push(patterns);
    whereConds.push(`(j.title ILIKE ANY($${p}) OR j.description ILIKE ANY($${p}))`);
    p++;
  }

  if (userLocations && userLocations.length > 0) {
    const patterns = userLocations.map(l => `%${l.trim()}%`);
    values.push(patterns);
    whereConds.push(`j.location ILIKE ANY($${p})`);
    p++;
  }

  const whereClause = whereConds.length > 0 ? `WHERE ${whereConds.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE COALESCE(uj.is_hidden, FALSE) = FALSE) AS total,
       COUNT(*) FILTER (WHERE COALESCE(uj.status, 'new') = 'new'          AND COALESCE(uj.is_hidden, FALSE) = FALSE) AS new,
       COUNT(*) FILTER (WHERE uj.status = 'saved'                          AND COALESCE(uj.is_hidden, FALSE) = FALSE) AS saved,
       COUNT(*) FILTER (WHERE uj.status = 'applied'                        AND COALESCE(uj.is_hidden, FALSE) = FALSE) AS applied,
       COUNT(*) FILTER (WHERE uj.status = 'interviewing'                   AND COALESCE(uj.is_hidden, FALSE) = FALSE) AS interviewing,
       COUNT(*) FILTER (WHERE uj.status = 'offered'                        AND COALESCE(uj.is_hidden, FALSE) = FALSE) AS offered,
       COUNT(*) FILTER (WHERE uj.status = 'rejected'                       AND COALESCE(uj.is_hidden, FALSE) = FALSE) AS rejected,
       COUNT(*) FILTER (WHERE COALESCE(uj.status, 'new') = 'new'          AND COALESCE(uj.is_hidden, FALSE) = FALSE AND j.created_at >= CURRENT_DATE) AS new_today
     FROM jobs j
     LEFT JOIN user_jobs uj ON j.id = uj.job_id AND uj.user_id = $1
     ${whereClause}`,
    values
  );
  const row = result.rows[0];
  return {
    total:        parseInt(row.total),
    new:          parseInt(row.new),
    saved:        parseInt(row.saved),
    applied:      parseInt(row.applied),
    interviewing: parseInt(row.interviewing),
    offered:      parseInt(row.offered),
    rejected:     parseInt(row.rejected),
    new_today:    parseInt(row.new_today),
  };
}

/**
 * Bulk upsert jobs (used by the fetcher — no user context)
 */
export async function bulkUpsert(jobs: Partial<Job>[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated  = 0;

  for (const job of jobs) {
    try {
      const existing = await findByExternalId(job.external_id!);
      if (existing) {
        await updateJobCore(existing.id, job);
        updated++;
      } else {
        await create(job);
        inserted++;
      }
    } catch (error) {
      console.error(`Error upserting job ${job.external_id}:`, error);
    }
  }

  return { inserted, updated };
}

/**
 * Delete a job by ID
 */
export async function deleteById(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
  return result.rowCount ? result.rowCount > 0 : false;
}
