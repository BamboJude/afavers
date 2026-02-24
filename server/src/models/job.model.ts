import { pool } from '../config/database.js';
import { Job, JobFilters } from '../types/index.js';

/**
 * Find a job by its external ID
 */
export async function findByExternalId(externalId: string): Promise<Job | null> {
  const result = await pool.query<Job>(
    'SELECT * FROM jobs WHERE external_id = $1',
    [externalId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new job
 */
export async function create(jobData: Partial<Job>): Promise<Job> {
  const {
    external_id,
    title,
    company,
    location,
    description,
    url,
    source,
    posted_date,
    deadline,
    salary,
    status = 'new'
  } = jobData;

  const result = await pool.query<Job>(
    `INSERT INTO jobs (
      external_id, title, company, location, description, url,
      source, posted_date, deadline, salary, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [external_id, title, company, location, description, url, source, posted_date, deadline, salary, status]
  );

  return result.rows[0];
}

/**
 * Update an existing job
 */
export async function update(id: number, updates: Partial<Job>): Promise<Job> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  // Build dynamic UPDATE query
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
  });

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);
  const query = `
    UPDATE jobs
    SET ${fields.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query<Job>(query, values);
  return result.rows[0];
}

/**
 * Find all jobs with optional filters
 */
export async function findAll(filters?: JobFilters): Promise<Job[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  // Build WHERE clauses
  if (filters?.status) {
    conditions.push(`status = $${paramCount}`);
    values.push(filters.status);
    paramCount++;
  }

  if (filters?.source) {
    conditions.push(`source = $${paramCount}`);
    values.push(filters.source);
    paramCount++;
  }

  if (filters?.search) {
    conditions.push(`(
      title ILIKE $${paramCount} OR
      company ILIKE $${paramCount} OR
      location ILIKE $${paramCount} OR
      description ILIKE $${paramCount}
    )`);
    values.push(`%${filters.search}%`);
    paramCount++;
  }

  // Always exclude hidden jobs by default
  conditions.push('is_hidden = FALSE');

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build ORDER BY clause
  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder || 'DESC';
  const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;

  // Build LIMIT/OFFSET clause
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  const paginationClause = `LIMIT ${limit} OFFSET ${offset}`;

  const query = `
    SELECT * FROM jobs
    ${whereClause}
    ${orderClause}
    ${paginationClause}
  `;

  const result = await pool.query<Job>(query, values);
  return result.rows;
}

/**
 * Bulk upsert jobs (insert or update if external_id exists)
 */
export async function bulkUpsert(jobs: Partial<Job>[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const job of jobs) {
    try {
      // Check if job exists
      const existing = await findByExternalId(job.external_id!);

      if (existing) {
        // Update existing job
        await update(existing.id, {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          url: job.url,
          posted_date: job.posted_date,
          deadline: job.deadline,
          salary: job.salary
        });
        updated++;
      } else {
        // Create new job
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
 * Find a job by its internal ID
 */
export async function findById(id: number): Promise<Job | null> {
  const result = await pool.query<Job>('SELECT * FROM jobs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Get status counts for all jobs (excluding hidden)
 */
export async function getStats(): Promise<{
  total: number; new: number; saved: number; applied: number;
  interviewing: number; offered: number; rejected: number; new_today: number;
}> {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE is_hidden = FALSE) as total,
      COUNT(*) FILTER (WHERE status = 'new' AND is_hidden = FALSE) as new,
      COUNT(*) FILTER (WHERE status = 'saved' AND is_hidden = FALSE) as saved,
      COUNT(*) FILTER (WHERE status = 'applied' AND is_hidden = FALSE) as applied,
      COUNT(*) FILTER (WHERE status = 'interviewing' AND is_hidden = FALSE) as interviewing,
      COUNT(*) FILTER (WHERE status = 'offered' AND is_hidden = FALSE) as offered,
      COUNT(*) FILTER (WHERE status = 'rejected' AND is_hidden = FALSE) as rejected,
      COUNT(*) FILTER (WHERE status = 'new' AND is_hidden = FALSE AND created_at >= CURRENT_DATE) as new_today
    FROM jobs
  `);
  const row = result.rows[0];
  return {
    total: parseInt(row.total),
    new: parseInt(row.new),
    saved: parseInt(row.saved),
    applied: parseInt(row.applied),
    interviewing: parseInt(row.interviewing),
    offered: parseInt(row.offered),
    rejected: parseInt(row.rejected),
    new_today: parseInt(row.new_today),
  };
}

/**
 * Delete a job by ID
 */
export async function deleteById(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
  return result.rowCount ? result.rowCount > 0 : false;
}

/**
 * Get job count by filters
 */
export async function count(filters?: Pick<JobFilters, 'status' | 'source' | 'search'>): Promise<number> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (filters?.status) {
    conditions.push(`status = $${paramCount}`);
    values.push(filters.status);
    paramCount++;
  }

  if (filters?.source) {
    conditions.push(`source = $${paramCount}`);
    values.push(filters.source);
    paramCount++;
  }

  if (filters?.search) {
    conditions.push(`(
      title ILIKE $${paramCount} OR
      company ILIKE $${paramCount} OR
      location ILIKE $${paramCount} OR
      description ILIKE $${paramCount}
    )`);
    values.push(`%${filters.search}%`);
    paramCount++;
  }

  conditions.push('is_hidden = FALSE');

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT COUNT(*) as count FROM jobs ${whereClause}`;

  const result = await pool.query<{ count: string }>(query, values);
  return parseInt(result.rows[0].count, 10);
}
