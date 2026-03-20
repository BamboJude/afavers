import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';
import { getStats, listUsers, toggleAdmin, deleteUser, getJobStats } from '../controllers/admin.controller.js';
import { listMessages, markRead, deleteMessage, replyMessage } from '../controllers/contact.controller.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticateToken, requireAdmin);

router.get('/stats',        getStats);
router.get('/users',        listUsers);
router.patch('/users/:id/toggle-admin', toggleAdmin);
router.delete('/users/:id', deleteUser);
router.get('/jobs/stats',   getJobStats);
router.get('/messages',             listMessages);
router.patch('/messages/:id/read',   markRead);
router.post('/messages/:id/reply',   replyMessage);
router.delete('/messages/:id',       deleteMessage);

export default router;
