import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { env } from '../config/env.js';

export interface InboxEmail {
  uid: number;
  from: string;
  fromName: string;
  subject: string;
  date: string;
  body: string;
  seen: boolean;
}

function getImapClient() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  return new ImapFlow({
    host: env.SMTP_HOST || 'mail.privateemail.com',
    port: 993,
    secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    logger: false,
  });
}

export async function fetchInbox(limit = 30): Promise<InboxEmail[]> {
  const client = getImapClient();
  if (!client) throw new Error('IMAP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS on Railway');

  const emails: InboxEmail[] = [];

  await client.connect();
  try {
    const mailbox = await client.mailboxOpen('INBOX');
    if (mailbox.exists === 0) return [];

    const lock = await client.getMailboxLock('INBOX');
    try {
      const start = Math.max(1, mailbox.exists - limit + 1);
      for await (const msg of client.fetch(`${start}:*`, {
        uid: true, flags: true, envelope: true, source: true,
      })) {
        try {
          const parsed = await simpleParser(msg.source);
          const fromAddr = parsed.from?.value?.[0]?.address || '';
          const fromName = parsed.from?.value?.[0]?.name || fromAddr;

          let body = parsed.text || '';
          if (!body && parsed.html) {
            // Strip HTML tags for plain text display
            body = parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          if (body.length > 4000) body = body.slice(0, 4000) + '…';

          emails.push({
            uid: msg.uid,
            from: fromAddr,
            fromName,
            subject: parsed.subject || '(no subject)',
            date: (parsed.date || msg.envelope.date || new Date()).toISOString(),
            body,
            seen: msg.flags.has('\\Seen'),
          });
        } catch {
          // Skip unparseable message
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return emails.reverse(); // newest first
}

export async function markSeen(uid: number): Promise<void> {
  const client = getImapClient();
  if (!client) return;
  await client.connect();
  try {
    await client.mailboxOpen('INBOX');
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
    } finally { lock.release(); }
  } finally { await client.logout(); }
}

export async function deleteEmail(uid: number): Promise<void> {
  const client = getImapClient();
  if (!client) return;
  await client.connect();
  try {
    await client.mailboxOpen('INBOX');
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageDelete({ uid }, { uid: true });
    } finally { lock.release(); }
  } finally { await client.logout(); }
}
