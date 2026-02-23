import cron from 'node-cron';
import { fetchAndSaveJobs } from '../services/fetchers/jobFetcher.service.js';

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
