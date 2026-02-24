import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';
import { pool } from '../config/database.js';

const router = express.Router();
router.use(authenticateToken);

const DEFAULT_KEYWORDS  = '';
const DEFAULT_LOCATIONS = '';

/** GET /api/settings */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT keywords, locations FROM user_settings WHERE user_id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.json({ keywords: DEFAULT_KEYWORDS, locations: DEFAULT_LOCATIONS });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/** PUT /api/settings */
router.put('/', async (req: AuthRequest, res) => {
  if (req.isDemo) {
    return res.status(403).json({ error: 'Not available in demo mode' });
  }
  try {
    const { keywords, locations } = req.body;
    if (!keywords || !locations) {
      return res.status(400).json({ error: 'keywords and locations are required' });
    }
    await pool.query(
      `INSERT INTO user_settings (user_id, keywords, locations, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         keywords   = EXCLUDED.keywords,
         locations  = EXCLUDED.locations,
         updated_at = NOW()`,
      [req.userId, keywords.trim(), locations.trim()]
    );
    res.json({ success: true, keywords: keywords.trim(), locations: locations.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
