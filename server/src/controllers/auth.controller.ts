import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getMailTransporter } from '../services/mail.service.js';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { User, UserResponse } from '../types/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ensureDemoUser } from '../services/demoReset.service.js';

// ── Account lockout (DB-backed) ────────────────────────────────────────────
const MAX_ATTEMPTS = 5;

async function isLocked(email: string): Promise<boolean> {
  const { rows } = await pool.query<{ locked_until: Date | null }>(
    'SELECT locked_until FROM login_attempts WHERE email = $1',
    [email]
  );
  if (rows.length === 0) return false;
  const lockedUntil = rows[0].locked_until;
  if (!lockedUntil) return false;
  if (new Date(lockedUntil) > new Date()) return true;
  // Lock expired — clean up
  await pool.query('DELETE FROM login_attempts WHERE email = $1', [email]);
  return false;
}

async function recordFailure(email: string): Promise<void> {
  await pool.query(
    `INSERT INTO login_attempts (email, attempts, updated_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (email) DO UPDATE SET
       attempts = CASE
         WHEN login_attempts.attempts + 1 >= $2 THEN 0
         ELSE login_attempts.attempts + 1
       END,
       locked_until = CASE
         WHEN login_attempts.attempts + 1 >= $2 THEN NOW() + INTERVAL '30 minutes'
         ELSE login_attempts.locked_until
       END,
       updated_at = NOW()`,
    [email, MAX_ATTEMPTS]
  );
}

async function clearFailures(email: string): Promise<void> {
  await pool.query('DELETE FROM login_attempts WHERE email = $1', [email]);
}
// ───────────────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Invalid email address';
  if (email.length > 254) return 'Email address is too long';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  return null;
}


export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const emailErr = validateEmail(email);
    if (emailErr) { res.status(400).json({ error: emailErr }); return; }
    const passErr = validatePassword(password);
    if (passErr) { res.status(400).json({ error: passErr }); return; }

    // Check account lockout before hitting the DB
    if (await isLocked(email.toLowerCase().trim())) {
      res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Try again in 30 minutes.' });
      return;
    }

    // Find user by email
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      await recordFailure(email.toLowerCase().trim());
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await recordFailure(email.toLowerCase().trim());
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    await clearFailures(email.toLowerCase().trim());

    // Admin privileges only granted when correct ADMIN_SECRET is provided
    const { adminKey } = req.body;
    const isAdmin = (user.is_admin ?? false) &&
      !!env.ADMIN_SECRET &&
      adminKey === env.ADMIN_SECRET;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without password) and token
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      isAdmin,
    };

    res.json({
      user: userResponse,
      token,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      const expiresAt = decoded?.exp
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await pool.query(
        'INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [tokenHash, expiresAt]
      );
    }
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logout successful' }); // Always succeed client-side
  }
};

export const loginDemo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const userId = await ensureDemoUser();
    const token = jwt.sign(
      { userId, email: 'demo@afavers.com', isDemo: true },
      env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ user: { id: userId, email: 'demo@afavers.com' }, token, isDemo: true });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Demo login failed' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.isDemo) {
    res.status(403).json({ error: 'Not available in demo mode' });
    return;
  }
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }

    const passErr = validatePassword(newPassword);
    if (passErr) { res.status(400).json({ error: passErr }); return; }

    const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Always respond with success to avoid revealing whether an email exists
    const result = await pool.query<User>('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      res.json({ message: 'If that email exists, a reset link has been sent.' });
      return;
    }

    const user = result.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate previous tokens for this user
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1', [user.id]);

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

    const transporter = getMailTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: `"afavers" <${env.SMTP_USER}>`,
        to: user.email,
        subject: 'Reset your afavers password',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Reset your password</h2>
            <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
              Reset Password
            </a>
            <p style="color:#6b7280;font-size:13px;">If you didn't request this, ignore this email — your password won't change.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
            <p style="color:#9ca3af;font-size:12px;">afavers.com — your automated job search assistant</p>
          </div>
        `,
      });
    } else {
      // Fallback: log the link to Railway console
      console.log(`\n🔑 Password reset link for ${user.email}:\n${resetUrl}\n`);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }
    const passErr = validatePassword(newPassword);
    if (passErr) { res.status(400).json({ error: passErr }); return; }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Reset link is invalid or has expired.' });
      return;
    }

    const { id: tokenId, user_id } = result.rows[0];
    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// For initial setup or password reset
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const emailErr = validateEmail(email);
    if (emailErr) { res.status(400).json({ error: emailErr }); return; }
    const passErr = validatePassword(password);
    if (passErr) { res.status(400).json({ error: passErr }); return; }

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      // Generic message — don't reveal whether the email is already registered
      res.status(409).json({ error: 'Registration failed. Please try a different email or contact support.' });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query<User>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, password_hash]
    );

    const user = result.rows[0];

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};
