import { Resend } from 'resend';
import { env } from '../config/env.js';

const FROM = '"afavers" <contact@afavers.online>';

export async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not set — add it in Railway environment variables');
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    text,
    html: html ?? text.replace(/\n/g, '<br/>'),
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) throw new Error(error.message);
}

/** Legacy compat: returns a nodemailer-like object for old callers */
export function getMailTransporter() {
  if (!env.RESEND_API_KEY) return null;
  return {
    sendMail: async (opts: { from?: string; to: string; subject: string; text: string; html?: string; replyTo?: string }) => {
      await sendMail({ to: opts.to, subject: opts.subject, text: opts.text, html: opts.html, replyTo: opts.replyTo });
    },
  };
}
