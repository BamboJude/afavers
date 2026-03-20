import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getProfile } from '../services/gamification.service.js';

const router = Router();

// All routes require auth
router.use(authenticateToken);

// GET /api/gamification — full profile (XP, level, streak, missions, achievements)
router.get('/', async (req, res, next) => {
  try {
    const userId = (req as any).user.id;
    const profile = await getProfile(userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
