import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { getMailTransporter } from '../services/mail.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

const CONTACT_EMAIL = 'contact@afavers.online';

/** POST /api/contact — public, no auth required */
export const submitContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }
    if (message.length > 5000) {
      res.status(400).json({ error: 'Message too long (max 5000 characters).' });
      return;
    }

    // Save to DB
    await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1,$2,$3,$4)`,
      [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
    );

    // Send email notification to contacts@afavers.com
    const transporter = getMailTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"afavers Contact" <${CONTACT_EMAIL}>`,
        to: CONTACT_EMAIL,
        replyTo: email,
        subject: `[afavers] ${subject}`,
        text: `From: ${name} <${email}>\n\n${message}`,
        html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><hr/><p>${message.replace(/\n/g, '<br/>')}</p>`,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
};

/** GET /api/admin/messages — list all contact messages */
export const listMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const unreadOnly = req.query['unreadOnly'] === 'true';
    const query = unreadOnly
      ? `SELECT * FROM contact_messages WHERE is_read = FALSE ORDER BY created_at DESC`
      : `SELECT * FROM contact_messages ORDER BY created_at DESC`;
    const result = await pool.query(query);
    const unreadCount = await pool.query(`SELECT COUNT(*) FROM contact_messages WHERE is_read = FALSE`);
    res.json({ messages: result.rows, unreadCount: parseInt((unreadCount.rows[0] as { count: string }).count) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/** PATCH /api/admin/messages/:id/read */
export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params['id'] as string);
    await pool.query(`UPDATE contact_messages SET is_read = TRUE WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

/** DELETE /api/admin/messages/:id */
export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params['id'] as string);
    await pool.query(`DELETE FROM contact_messages WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
};
