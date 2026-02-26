import cron from 'node-cron';
import { fetchAndSaveJobs } from '../services/fetchers/jobFetcher.service.js';
import { resetDemoData, ensureDemoUser } from '../services/demoReset.service.js';
import { pool } from '../config/database.js';

/**
 * Initialize job fetch cron job
 * Runs every 2 hours (cron: 0 star-slash-2 star star star)
 */
export function initializeJobFetchCron(): void {
  console.log('⏰ Initializing job fetch cron job...');

  // Schedule job to run every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    console.log('\n⏰ [CRON] Starting scheduled job fetch...');

    try {
      const result = await fetchAndSaveJobs();
      console.log('[CRON] ✅ Job fetch completed successfully');
    } catch (error) {
      console.error('[CRON] ❌ Job fetch failed:', error);
    }
  });

  // Daily midnight: reset demo data + clean expired security records
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Resetting demo data...');
    await resetDemoData();

    // Clean up expired token blacklist entries and stale lockout records
    const { rowCount: blacklistCleaned } = await pool.query(
      'DELETE FROM token_blacklist WHERE expires_at < NOW()'
    );
    const { rowCount: lockoutCleaned } = await pool.query(
      "DELETE FROM login_attempts WHERE locked_until IS NULL OR locked_until < NOW() - INTERVAL '1 hour'"
    );
    console.log(`[CRON] Security cleanup: removed ${blacklistCleaned} expired tokens, ${lockoutCleaned} stale lockouts`);
  });

  // Seed demo data on startup (ensures demo user + data always exists)
  ensureDemoUser().then(userId => {
    resetDemoData().catch(console.error);
  }).catch(console.error);

  console.log('✅ Cron job scheduled: Every 2 hours');
  console.log('   Next run at: ' + getNextCronTime());

  // Run immediately on startup (optional - useful for testing)
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🚀 Running initial job fetch (development mode)...');
    fetchAndSaveJobs().catch((error) => {
      console.error('Initial job fetch failed:', error);
    });
  }
}

/**
 * Get the next cron execution time (approximate)
 */
function getNextCronTime(): string {
  const now = new Date();
  const next = new Date(now);

  // Find next even hour
  const currentHour = now.getHours();
  const nextEvenHour = currentHour % 2 === 0 ? currentHour + 2 : currentHour + 1;

  next.setHours(nextEvenHour, 0, 0, 0);

  // If we've passed today's last even hour, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  }

  return next.toLocaleString();
}
