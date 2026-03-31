import { Router } from 'express';
import { Response } from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';

const router = Router();
router.use(authenticateToken);

const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many searches — please wait a minute.' },
});

const BASE_URL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs';
const DEFAULT_LOCATIONS = ['Düsseldorf', 'Köln', 'Essen', 'Bochum', 'Dortmund'];
const HEADERS = {
  'User-Agent': 'Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1077; iOS 15.1.0) Alamofire/5.4.4',
  'X-API-Key': env.BUNDESAGENTUR_API_KEY || 'jobboerse-jobsuche',
  'Host': 'rest.arbeitsagentur.de',
  'Connection': 'keep-alive',
};

interface BAJob {
  refnr: string;
  titel?: string;
  beruf?: string;
  arbeitgeber?: string;
  arbeitsort?: { ort?: string; plz?: string };
  aktuelleVeroeffentlichungsdatum?: string;
  modifikationsTimestamp?: string;
}

router.get('/', searchLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const keyword  = ((req.query['keyword']  as string) || '').trim();
    const location = ((req.query['location'] as string) || '').trim();

    // Load user's saved locations and keywords
    let userLocations: string[] = [];
    let userKeywords:  string[] = [];
    try {
      const { rows } = await pool.query(
        'SELECT keywords, locations FROM user_settings WHERE user_id = $1',
        [req.userId]
      );
      if (rows[0]?.locations) {
        userLocations = rows[0].locations.split(',').map((l: string) => l.trim()).filter(Boolean);
      }
      if (rows[0]?.keywords) {
        userKeywords = rows[0].keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
      }
    } catch { /* use defaults */ }

    const locations = location
      ? [location]
      : (userLocations.length > 0 ? userLocations : DEFAULT_LOCATIONS);

    // Build search term: always include "werkstudent", add user or custom keyword
    const extra = keyword || (userKeywords.length > 0 ? userKeywords[0] : '');
    const searchTerm = extra ? `werkstudent ${extra}` : 'werkstudent';

    const seen   = new Set<string>();
    const jobs: object[] = [];

    for (const loc of locations.slice(0, 6)) {
      try {
        const { data } = await axios.get<{ stellenangebote?: BAJob[] }>(BASE_URL, {
          params: {
            was: searchTerm,
            wo:  loc,
            size: 25,
            page: 1,
            angebotsart: 1,
            umkreis: 25,
          },
          headers: HEADERS,
          timeout: 8000,
        });

        for (const j of data?.stellenangebote ?? []) {
          if (seen.has(j.refnr)) continue;
          seen.add(j.refnr);
          const city = j.arbeitsort?.ort || loc;
          const plz  = j.arbeitsort?.plz || '';
          jobs.push({
            refnr:      j.refnr,
            title:      j.titel || j.beruf || 'Werkstudent Position',
            company:    j.arbeitgeber || 'Nicht angegeben',
            location:   plz ? `${city} (${plz})` : city,
            postedDate: j.aktuelleVeroeffentlichungsdatum || j.modifikationsTimestamp,
            url:        `https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.refnr}`,
          });
        }
      } catch { /* skip failed location */ }
    }

    res.json({
      jobs,
      total:        jobs.length,
      searchTerm,
      locations,
      userKeywords,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// GET /api/werkstudent/saved — list user's saved/applied werkstudent jobs (refnr → status map)
router.get('/saved', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT refnr, status FROM werkstudent_saved WHERE user_id = $1',
      [req.userId]
    );
    const map: Record<string, string> = {};
    rows.forEach((r: { refnr: string; status: string }) => { map[r.refnr] = r.status; });
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/werkstudent/save — save a job (status = 'saved')
router.post('/save', async (req: AuthRequest, res: Response) => {
  const { refnr, title, company, location, url, posted_date } = req.body;
  if (!refnr || !title || !company || !url) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    await pool.query(
      `INSERT INTO werkstudent_saved (user_id, refnr, title, company, location, url, posted_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'saved')
       ON CONFLICT (user_id, refnr) DO UPDATE SET status='saved', updated_at=NOW()`,
      [req.userId, refnr, title, company, location || '', url, posted_date || null]
    );
    res.json({ status: 'saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/werkstudent/apply — mark a job as applied (upserts)
router.post('/apply', async (req: AuthRequest, res: Response) => {
  const { refnr, title, company, location, url, posted_date } = req.body;
  if (!refnr || !title || !company || !url) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    await pool.query(
      `INSERT INTO werkstudent_saved (user_id, refnr, title, company, location, url, posted_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'applied')
       ON CONFLICT (user_id, refnr) DO UPDATE SET status='applied', updated_at=NOW()`,
      [req.userId, refnr, title, company, location || '', url, posted_date || null]
    );
    res.json({ status: 'applied' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/werkstudent/save/:refnr — unsave a job
router.delete('/save/:refnr', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      'DELETE FROM werkstudent_saved WHERE user_id = $1 AND refnr = $2',
      [req.userId, req.params['refnr']]
    );
    res.json({ status: 'removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
