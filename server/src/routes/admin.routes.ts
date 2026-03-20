import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';
import { getStats, listUsers, toggleAdmin, deleteUser, getJobStats } from '../controllers/admin.controller.js';
import { listMessages, markRead, deleteMessage, replyMessage } from '../controllers/contact.controller.js';
import { fetchInbox, markSeen, deleteEmail } from '../services/inbox.service.js';
import { getMailTransporter } from '../services/mail.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Response } from 'express';

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

// ── Inbox (IMAP) ──────────────────────────────────────────────────────────
router.get('/inbox', async (_req: AuthRequest, res: Response) => {
  try {
    const emails = await fetchInbox(50);
    res.json({ emails });
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'Inbox unavailable' });
  }
});

router.patch('/inbox/:uid/seen', async (req: AuthRequest, res: Response) => {
  try {
    await markSeen(parseInt(req.params['uid'] as string));
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/inbox/:uid', async (req: AuthRequest, res: Response) => {
  try {
    await deleteEmail(parseInt(req.params['uid'] as string));
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.post('/inbox/send', async (req: AuthRequest, res: Response) => {
  try {
    const { to, subject, body } = req.body as { to: string; subject: string; body: string };
    if (!to || !subject || !body) { res.status(400).json({ error: 'to, subject and body required' }); return; }
    const transporter = getMailTransporter();
    if (!transporter) { res.status(503).json({ error: 'Mail not configured' }); return; }
    await transporter.sendMail({
      from: '"afavers" <contact@afavers.online>',
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br/>'),
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Send failed' });
  }
});

export default router;
