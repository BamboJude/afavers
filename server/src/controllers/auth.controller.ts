import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { User, UserResponse } from '../types/index.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ensureDemoUser } from '../services/demoReset.service.js';

function getMailTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email
    const result = await pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
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

export const logout = async (req: Request, res: Response): Promise<void> => {
  // With JWT, logout is handled client-side by removing the token
  // Server can implement token blacklisting if needed
  res.json({ message: 'Logout successful' });
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

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

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
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

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

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'User already exists' });
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
