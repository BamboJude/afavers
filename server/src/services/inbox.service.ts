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
  });
}

export async function fetchInbox(limit = 30): Promise<InboxEmail[]> {
  const client = getImapClient();
  if (!client) throw new Error('IMAP not configured');

  const emails: InboxEmail[] = [];

  await client.connect();
  try {
    await client.mailboxOpen('INBOX');
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Fetch last `limit` messages
      for await (const msg of client.fetch(`${Math.max(1, (client.mailbox as any).exists - limit + 1)}:*`, {
        uid: true, flags: true, envelope: true, bodyStructure: true, source: true,
      })) {
        const from = msg.envelope.from?.[0];
        const fromAddr = from ? `${from.address}` : '';
        const fromName = from?.name || fromAddr;

        // Parse plain text from source
        let body = '';
        const raw = msg.source?.toString() || '';
        // Strip headers — find double CRLF
        const bodyStart = raw.indexOf('\r\n\r\n');
        if (bodyStart !== -1) {
          body = raw.slice(bodyStart + 4).trim();
          // Remove base64/quoted-printable artifacts for plain text
          if (body.length > 5000) body = body.slice(0, 5000) + '…';
        }

        emails.push({
          uid: msg.uid,
          from: fromAddr,
          fromName,
          subject: msg.envelope.subject || '(no subject)',
          date: msg.envelope.date?.toISOString() || new Date().toISOString(),
          body,
          seen: msg.flags.has('\\Seen'),
        });
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
    const lock = await client.getMailboxLock('INBOX');
    try {
      await client.messageDelete({ uid }, { uid: true });
    } finally { lock.release(); }
  } finally { await client.logout(); }
}
