import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/auth/login - Login with email and password
router.post('/login', authController.login);

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', authController.logout);

// POST /api/auth/register - Create new user (for initial setup)
router.post('/register', authController.createUser);

// PATCH /api/auth/password - Change password (authenticated)
router.patch('/password', authenticateToken, authController.changePassword);

export default router;
