import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export function getMailTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;

  // cPanel / generic SMTP host (e.g. mail.afavers.com)
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  // Fallback: Gmail
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}
