import express from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// 10 attempts per 15 minutes per IP on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

// Stricter limit for password reset (5 per hour)
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again in 1 hour.' },
});

// POST /api/auth/login - Login with email and password
router.post('/login', authLimiter, authController.login);

// POST /api/auth/demo - One-click demo login (no credentials needed)
router.post('/demo', authController.loginDemo);

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', authController.logout);

// POST /api/auth/register - Create new user (for initial setup)
router.post('/register', authController.createUser);

// PATCH /api/auth/password - Change password (authenticated)
router.patch('/password', authenticateToken, authController.changePassword);

// POST /api/auth/forgot-password - Request password reset email
router.post('/forgot-password', resetLimiter, authController.forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', authLimiter, authController.resetPassword);

export default router;
