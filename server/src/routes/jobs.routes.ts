import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { fetchAndSaveJobs } from '../services/fetchers/jobFetcher.service.js';
import * as jobModel from '../models/job.model.js';

const router = express.Router();

// All job routes require authentication
router.use(authenticateToken);

/**
 * POST /api/jobs/fetch
 * Manually trigger job fetching
 */
router.post('/fetch', async (req, res) => {
  try {
    console.log('📡 Manual job fetch triggered');
    const result = await fetchAndSaveJobs();

    res.json({
      success: true,
      message: 'Job fetch completed',
      ...result
    });
  } catch (error) {
    console.error('Manual job fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Job fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/jobs
 * Get all jobs with filtering
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      source: req.query.source as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const jobs = await jobModel.findAll(filters);
    const total = await jobModel.count({
      status: filters.status,
      source: filters.source,
      search: filters.search
    });

    res.json({
      jobs,
      total,
      page: filters.offset ? Math.floor(filters.offset / (filters.limit || 50)) + 1 : 1,
      limit: filters.limit || 50
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/jobs/stats
 * Get job counts grouped by status
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await jobModel.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/jobs/:id
 * Get single job by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const job = await jobModel.findById(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * PATCH /api/jobs/:id/status
 * Update job status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, appliedDate, followUpDate } = req.body;

    const updates: any = { status };

    if (appliedDate) {
      updates.applied_date = new Date(appliedDate);
    }

    if (followUpDate) {
      updates.follow_up_date = new Date(followUpDate);
    }

    const updatedJob = await jobModel.update(id, updates);

    res.json({
      success: true,
      job: updatedJob
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

/**
 * PATCH /api/jobs/:id/notes
 * Update job notes
 */
router.patch('/:id/notes', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body;

    const updatedJob = await jobModel.update(id, { notes });

    res.json({
      success: true,
      job: updatedJob
    });
  } catch (error) {
    console.error('Error updating job notes:', error);
    res.status(500).json({ error: 'Failed to update job notes' });
  }
});

/**
 * PATCH /api/jobs/:id/hide
 * Hide/show a job
 */
router.patch('/:id/hide', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isHidden } = req.body;

    const updatedJob = await jobModel.update(id, { is_hidden: isHidden });

    res.json({
      success: true,
      job: updatedJob
    });
  } catch (error) {
    console.error('Error hiding/showing job:', error);
    res.status(500).json({ error: 'Failed to hide/show job' });
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete a job
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await jobModel.deleteById(id);

    if (!success) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
