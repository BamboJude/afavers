import express from 'express';
import rateLimit from 'express-rate-limit';
import { submitContact } from '../controllers/contact.controller.js';

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many messages sent. Please try again in 1 hour.' },
});

router.post('/', contactLimiter, submitContact);

export default router;
