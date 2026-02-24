import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';
import { fetchAndSaveJobs } from '../services/fetchers/jobFetcher.service.js';
import { pool } from '../config/database.js';
import * as jobModel from '../models/job.model.js';

const router = express.Router();
router.use(authenticateToken);

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

/** GET /api/jobs — list jobs filtered to user's keywords/locations */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const q = (key: string) => req.query[key] as string | undefined;
    const { userKeywords, userLocations } = await getUserSearchFilters(req.userId!);

    const filters = {
      status:    q('status'),
      source:    q('source'),
      search:    q('search'),
      sortBy:    q('sortBy'),
      sortOrder: q('sortOrder') as 'ASC' | 'DESC' | undefined,
      limit:     q('limit')  ? parseInt(q('limit')!)  : undefined,
      offset:    q('offset') ? parseInt(q('offset')!) : undefined,
      language:  q('language') as 'en' | 'de' | undefined,
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

/** GET /api/jobs/:id — single job with user-specific overlay */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const job = await jobModel.findById(parseInt(req.params.id as string), req.userId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/** PATCH /api/jobs/:id/status */
router.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const jobId = parseInt(req.params.id as string);
    const { status, appliedDate, followUpDate } = req.body;

    await jobModel.upsertUserJob(req.userId!, jobId, {
      status,
      applied_date:   appliedDate   ? new Date(appliedDate)   : undefined,
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
    const jobId = parseInt(req.params.id as string);
    await jobModel.upsertUserJob(req.userId!, jobId, { notes: req.body.notes });
    const job = await jobModel.findById(jobId, req.userId);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

/** PATCH /api/jobs/:id/hide */
router.patch('/:id/hide', async (req: AuthRequest, res) => {
  try {
    const jobId = parseInt(req.params.id as string);
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
    const success = await jobModel.deleteById(parseInt(req.params.id as string));
    if (!success) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
