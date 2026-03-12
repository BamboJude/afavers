import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [users, jobs, statusBreakdown, recentUsers, dailySignups] = await Promise.all([
      pool.query<{ count: string; admin_count: string }>(`
        SELECT COUNT(*) AS count, COUNT(*) FILTER (WHERE is_admin) AS admin_count FROM users
        WHERE email != 'demo@afavers.com'
      `),
      pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM jobs`),
      pool.query<{ status: string; count: string }>(`
        SELECT uj.status, COUNT(*) AS count
        FROM user_jobs uj
        JOIN users u ON u.id = uj.user_id
        WHERE u.email != 'demo@afavers.com'
        GROUP BY uj.status ORDER BY count DESC
      `),
      pool.query<{ id: number; email: string; created_at: Date }>(`
        SELECT id, email, created_at FROM users
        WHERE email != 'demo@afavers.com'
        ORDER BY created_at DESC LIMIT 5
      `),
      pool.query<{ day: string; count: string }>(`
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM users
        WHERE email != 'demo@afavers.com'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day ASC
      `),
    ]);

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      adminCount: parseInt(users.rows[0].admin_count),
      totalJobs: parseInt(jobs.rows[0].count),
      statusBreakdown: statusBreakdown.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
      recentUsers: recentUsers.rows,
      dailySignups: dailySignups.rows.map(r => ({ day: r.day, count: parseInt(r.count) })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = (req.query.search as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const searchParam = `%${search}%`;
    const { rows } = await pool.query<{
      id: number; email: string; is_admin: boolean; created_at: Date;
      job_count: string; applied_count: string;
    }>(`
      SELECT
        u.id, u.email, u.is_admin, u.created_at,
        COUNT(uj.id) AS job_count,
        COUNT(uj.id) FILTER (WHERE uj.status = 'applied') AS applied_count
      FROM users u
      LEFT JOIN user_jobs uj ON uj.user_id = u.id
      WHERE u.email != 'demo@afavers.com'
        AND ($1 = '%' OR u.email ILIKE $1)
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `, [searchParam === '%%' ? '%' : searchParam, limit, offset]);

    const countResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM users WHERE email != 'demo@afavers.com' AND ($1 = '%' OR email ILIKE $1)`,
      [searchParam === '%%' ? '%' : searchParam]
    );

    res.json({
      users: rows.map(u => ({
        id: u.id,
        email: u.email,
        isAdmin: u.is_admin,
        createdAt: u.created_at,
        jobCount: parseInt(u.job_count),
        appliedCount: parseInt(u.applied_count),
      })),
      total: parseInt(countResult.rows[0].total),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

export const toggleAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.userId) {
      res.status(400).json({ error: 'Cannot modify your own admin status' });
      return;
    }

    const { rows } = await pool.query<{ id: number; is_admin: boolean }>(
      'UPDATE users SET is_admin = NOT is_admin WHERE id = $1 RETURNING id, is_admin',
      [targetId]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ id: rows[0].id, isAdmin: rows[0].is_admin });
  } catch (error) {
    console.error('Toggle admin error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.userId) {
      res.status(400).json({ error: 'Cannot delete your own account from admin panel' });
      return;
    }

    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [targetId]);
    if (!rowCount) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const getJobStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [total, bySource, byStatus, recentFetches] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM jobs'),
      pool.query<{ source: string; count: string }>(`
        SELECT source, COUNT(*) AS count FROM jobs GROUP BY source ORDER BY count DESC
      `),
      pool.query<{ status: string; count: string }>(`
        SELECT status, COUNT(*) AS count FROM user_jobs GROUP BY status ORDER BY count DESC
      `),
      pool.query<{ day: string; count: string }>(`
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM jobs
        WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY day ORDER BY day DESC LIMIT 14
      `),
    ]);

    res.json({
      totalJobs: parseInt(total.rows[0].count),
      bySource: bySource.rows.map(r => ({ source: r.source, count: parseInt(r.count) })),
      byStatus: byStatus.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
      recentFetches: recentFetches.rows.map(r => ({ day: r.day, count: parseInt(r.count) })),
    });
  } catch (error) {
    console.error('Admin job stats error:', error);
    res.status(500).json({ error: 'Failed to load job stats' });
  }
};
