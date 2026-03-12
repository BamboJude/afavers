import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../config/database.js';

// Extend Express Request to include userId
export interface AuthRequest extends Request {
  userId?: number;
  isDemo?: boolean;
  isAdmin?: boolean;
}

interface JWTPayload {
  userId: number;
  email: string;
  isDemo?: boolean;
  isAdmin?: boolean;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Check token blacklist (catches logged-out tokens)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query(
      'SELECT 1 FROM token_blacklist WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    if (rows.length > 0) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }

    req.userId = decoded.userId;
    req.isDemo = decoded.isDemo ?? false;
    req.isAdmin = decoded.isAdmin ?? false;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
