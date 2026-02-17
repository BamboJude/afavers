import express from 'express';
import * as authController from '../controllers/auth.controller';

const router = express.Router();

// POST /api/auth/login - Login with email and password
router.post('/login', authController.login);

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', authController.logout);

// POST /api/auth/register - Create new user (for initial setup)
router.post('/register', authController.createUser);

export default router;
