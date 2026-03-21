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
    // Prevent hanging connections
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
    disableAutoIdle: true,
  } as any);
}

/** Wrap any async op with a max timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function fetchInbox(limit = 20): Promise<InboxEmail[]> {
  const client = getImapClient();
  if (!client) throw new Error('IMAP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS on Railway');

  const emails: InboxEmail[] = [];

  await withTimeout(client.connect(), 12000, 'IMAP connect');
  try {
    const lock = await withTimeout(client.getMailboxLock('INBOX'), 8000, 'IMAP lock');
    try {
      const exists = (client.mailbox as any)?.exists as number ?? 0;
      if (exists > 0) {
        const start = Math.max(1, exists - limit + 1);
        const rawMsgs: Array<{ uid: number; flags: Set<string>; envelope: any; source: Buffer }> = [];

        // Collect all messages first (streaming)
        for await (const msg of client.fetch(`${start}:*`, {
          uid: true, flags: true, envelope: true, source: true,
        })) {
          rawMsgs.push({
            uid: msg.uid,
            flags: msg.flags,
            envelope: msg.envelope,
            source: msg.source,
          });
        }

        // Parse all in parallel
        const parsed = await Promise.all(
          rawMsgs.map(async (msg) => {
            try {
              const p = await simpleParser(msg.source);
              const fromAddr = p.from?.value?.[0]?.address || '';
              const fromName = p.from?.value?.[0]?.name || fromAddr;
              let body = p.text?.trim() || '';
              if (!body && p.html) {
                body = p.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              }
              if (body.length > 3000) body = body.slice(0, 3000) + '…';
              return {
                uid: msg.uid,
                from: fromAddr,
                fromName,
                subject: p.subject || '(no subject)',
                date: (p.date || msg.envelope.date || new Date()).toISOString(),
                body,
                seen: msg.flags.has('\\Seen'),
              } satisfies InboxEmail;
            } catch {
              return null;
            }
          })
        );

        emails.push(...(parsed.filter(Boolean) as InboxEmail[]));
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
  await withTimeout(client.connect(), 10000, 'IMAP connect');
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
    } finally { lock.release(); }
  } finally { await client.logout(); }
}

export async function deleteEmail(uid: number): Promise<void> {
  const client = getImapClient();
  if (!client) return;
  await withTimeout(client.connect(), 10000, 'IMAP connect');
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageDelete({ uid }, { uid: true });
    } finally { lock.release(); }
  } finally { await client.logout(); }
}
