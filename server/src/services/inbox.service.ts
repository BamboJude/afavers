import { ImapFlow } from 'imapflow';
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
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
    disableAutoIdle: true,
  } as any);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ]);
}

/** Decode quoted-printable */
function decodeQP(s: string): string {
  return s
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Extract readable body from raw MIME source */
function extractBody(raw: string): string {
  // Find body after blank line
  const sep = raw.indexOf('\r\n\r\n');
  if (sep === -1) return '';

  const headers = raw.slice(0, sep).toLowerCase();
  let body = raw.slice(sep + 4);

  // Detect encoding
  const encodingMatch = headers.match(/content-transfer-encoding:\s*(\S+)/);
  const encoding = encodingMatch?.[1]?.trim().toLowerCase() ?? '';

  // For multipart, try to find first text/plain part
  const boundaryMatch = headers.match(/boundary="?([^"\r\n;]+)"?/);
  if (boundaryMatch) {
    const boundary = '--' + boundaryMatch[1].trim();
    const parts = body.split(boundary);
    for (const part of parts) {
      const partLower = part.toLowerCase();
      if (partLower.includes('content-type: text/plain') || partLower.includes('content-type:text/plain')) {
        const partSep = part.indexOf('\r\n\r\n');
        if (partSep !== -1) {
          const partHeaders = part.slice(0, partSep).toLowerCase();
          const partBody = part.slice(partSep + 4).trim();
          const partEnc = partHeaders.match(/content-transfer-encoding:\s*(\S+)/)?.[1]?.trim().toLowerCase() ?? '';
          if (partEnc === 'base64') {
            return Buffer.from(partBody.replace(/\s+/g, ''), 'base64').toString('utf-8').trim();
          }
          if (partEnc === 'quoted-printable') {
            return decodeQP(partBody).trim();
          }
          return partBody.trim();
        }
      }
    }
    // Fallback: try html part
    for (const part of parts) {
      const partLower = part.toLowerCase();
      if (partLower.includes('content-type: text/html') || partLower.includes('content-type:text/html')) {
        const partSep = part.indexOf('\r\n\r\n');
        if (partSep !== -1) {
          const partBody = part.slice(partSep + 4).trim();
          return partBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    }
    return '';
  }

  // Non-multipart: decode directly
  if (encoding === 'base64') {
    return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf-8').trim();
  }
  if (encoding === 'quoted-printable') {
    return decodeQP(body).trim();
  }
  return body.trim();
}

export async function fetchInbox(limit = 20): Promise<InboxEmail[]> {
  const client = getImapClient();
  if (!client) throw new Error('IMAP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in your backend environment');

  const emails: InboxEmail[] = [];

  await withTimeout(client.connect(), 12000, 'IMAP connect');
  try {
    const lock = await withTimeout(client.getMailboxLock('INBOX'), 8000, 'IMAP lock');
    try {
      const exists = (client.mailbox as any)?.exists as number ?? 0;
      if (exists > 0) {
        const start = Math.max(1, exists - limit + 1);
        for await (const msg of client.fetch(`${start}:*`, {
          uid: true, flags: true, envelope: true, source: true,
        })) {
          try {
            const raw = msg.source.toString('utf-8');
            let body = extractBody(raw);
            if (body.length > 3000) body = body.slice(0, 3000) + '…';

            const from = msg.envelope.from?.[0];
            const fromAddr = from?.address ?? '';
            const fromName = from?.name ?? fromAddr;

            emails.push({
              uid: msg.uid,
              from: fromAddr,
              fromName,
              subject: msg.envelope.subject ?? '(no subject)',
              date: (msg.envelope.date ?? new Date()).toISOString(),
              body,
              seen: msg.flags.has('\\Seen'),
            });
          } catch { /* skip bad message */ }
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return emails.reverse();
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
