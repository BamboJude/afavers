import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';
import { fetchAndSaveJobs } from '../services/fetchers/jobFetcher.service.js';
import { pool } from '../config/database.js';
import * as jobModel from '../models/job.model.js';

const router = express.Router();

// ── Public endpoint (no auth required) ──────────────────────────────────────
router.get('/public', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, company, location, url, salary, source, posted_date
       FROM jobs
       WHERE url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public jobs' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

router.use(authenticateToken);

function parseId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return isNaN(n) || n <= 0 ? null : n;
}

/** Helper: get the logged-in user's keyword/location preferences */
async function getUserSearchFilters(userId: number): Promise<{ userKeywords: string[]; userLocations: string[] }> {
  try {
    const result = await pool.query(
      'SELECT keywords, locations FROM user_settings WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length > 0) {
      const { keywords, locations } = result.rows[0];
      return {
        userKeywords: keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
        userLocations: locations.split(',').map((l: string) => l.trim()).filter(Boolean),
      };
    }
  } catch { /* fall through to empty */ }
  return { userKeywords: [], userLocations: [] };
}

/** POST /api/jobs/fetch — manually trigger job fetching */
router.post('/fetch', async (req: AuthRequest, res) => {
  if (req.isDemo) {
    res.status(403).json({ error: 'Not available in demo mode' });
    return;
  }
  try {
    const result = await fetchAndSaveJobs();
    res.json({ success: true, message: 'Job fetch completed', ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Job fetch failed' });
  }
});

/** GET /api/jobs/stats — per-user status counts (filtered by user's settings) */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const { userKeywords, userLocations } = await getUserSearchFilters(req.userId!);
    const stats = await jobModel.getStats(req.userId, userKeywords, userLocations);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/** GET /api/jobs — list jobs; keyword/location filters skipped when ?noFilter=true */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const q = (key: string) => req.query[key] as string | undefined;
    const noFilter = q('noFilter') === 'true';
    const { userKeywords, userLocations } = noFilter
      ? { userKeywords: [], userLocations: [] }
      : await getUserSearchFilters(req.userId!);

    const filters = {
      status:    q('status'),
      source:    q('source'),
      search:    q('search'),
      sortBy:    q('sortBy'),
      sortOrder: q('sortOrder') as 'ASC' | 'DESC' | undefined,
      limit:     q('limit')  ? parseInt(q('limit')!)  : undefined,
      offset:    q('offset') ? parseInt(q('offset')!) : undefined,
      language:  q('language') as 'en' | 'de' | undefined,
      dateFrom:  q('dateFrom'),
      userKeywords,
      userLocations,
    };

    const [jobs, total] = await Promise.all([
      jobModel.findAll(filters, req.userId),
      jobModel.count(filters, req.userId),
    ]);

    res.json({
      jobs,
      total,
      page:  filters.offset ? Math.floor(filters.offset / (filters.limit || 50)) + 1 : 1,
      limit: filters.limit || 50,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/** GET /api/jobs/follow-ups — jobs with overdue/today follow-up dates */
router.get('/follow-ups', async (req: AuthRequest, res) => {
  try {
    const alerts = await jobModel.getFollowUps(req.userId!);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

/** GET /api/jobs/analytics */
router.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const data = await jobModel.getAnalytics(req.userId!);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/** GET /api/jobs/export — download tracked jobs as CSV */
router.get('/export', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT j.title, j.company, j.location, j.source,
              COALESCE(uj.status, 'new') AS status,
              uj.applied_date, j.url, j.posted_date, j.salary, j.deadline
       FROM jobs j
       JOIN user_jobs uj ON j.id = uj.job_id AND uj.user_id = $1
       WHERE uj.status IN ('saved','applied','interviewing','offered','rejected')
         AND COALESCE(uj.is_hidden, FALSE) = FALSE
       ORDER BY uj.applied_date DESC NULLS LAST, uj.updated_at DESC`,
      [req.userId]
    );

    const escape = (val: unknown) => {
      if (val == null) return '';
      const s = val instanceof Date ? val.toISOString().slice(0, 10) : String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ['Title','Company','Location','Source','Status','Applied Date','URL','Posted Date','Salary','Deadline'];
    const csv = [
      headers.join(','),
      ...result.rows.map(r => [
        escape(r.title), escape(r.company), escape(r.location), escape(r.source),
        escape(r.status), escape(r.applied_date), escape(r.url),
        escape(r.posted_date), escape(r.salary), escape(r.deadline),
      ].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="afavers-applications.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

/** GET /api/jobs/:id — single job with user-specific overlay */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const jobId = parseId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
    const job = await jobModel.findById(jobId, req.userId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/** PATCH /api/jobs/:id/status */
router.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const jobId = parseId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
    const { status, appliedDate, followUpDate } = req.body;

    // Auto-set applied_date to today when marking as applied (if not already provided)
    let resolvedAppliedDate: Date | undefined = appliedDate ? new Date(appliedDate) : undefined;
    if (status === 'applied' && !appliedDate) {
      // Check if applied_date is already set; if not, set it to today
      const existing = await jobModel.findById(jobId, req.userId);
      if (!existing?.applied_date) resolvedAppliedDate = new Date();
    }

    await jobModel.upsertUserJob(req.userId!, jobId, {
      status,
      applied_date:   resolvedAppliedDate,
      follow_up_date: followUpDate  ? new Date(followUpDate)  : undefined,
    });

    const job = await jobModel.findById(jobId, req.userId);
    res.json({ success: true, job });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/** PATCH /api/jobs/:id/notes */
router.patch('/:id/notes', async (req: AuthRequest, res) => {
  try {
    const jobId = parseId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
    await jobModel.upsertUserJob(req.userId!, jobId, { notes: req.body.notes });
    const job = await jobModel.findById(jobId, req.userId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

/** PATCH /api/jobs/:id/cover-letter */
router.patch('/:id/cover-letter', async (req: AuthRequest, res) => {
  try {
    const jobId = parseId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
    await jobModel.upsertUserJob(req.userId!, jobId, { cover_letter: req.body.coverLetter });
    const job = await jobModel.findById(jobId, req.userId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cover letter' });
  }
});

/** PATCH /api/jobs/:id/interview-date */
router.patch('/:id/interview-date', async (req: AuthRequest, res) => {
  try {
    const jobId = parseId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
    const interview_date = req.body.interviewDate ? new Date(req.body.interviewDate) : null;
    await jobModel.upsertUserJob(req.userId!, jobId, { interview_date });
    const job = await jobModel.findById(jobId, req.userId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update interview date' });
  }
});

/** PATCH /api/jobs/:id/hide */
router.patch('/:id/hide', async (req: AuthRequest, res) => {
  try {
    const jobId = parseId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
    await jobModel.upsertUserJob(req.userId!, jobId, { is_hidden: req.body.isHidden });
    const job = await jobModel.findById(jobId, req.userId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to hide/show job' });
  }
});

/** DELETE /api/jobs/:id */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const jobId = parseId(req.params.id);
    if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
    const success = await jobModel.deleteById(jobId);
    if (!success) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
