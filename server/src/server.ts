import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/database.js';
import { runMigrations } from './db/migrate.js';
import { initializeJobFetchCron } from './jobs/jobFetchCron.js';

console.log('[startup] PORT=' + process.env.PORT + ' NODE_ENV=' + process.env.NODE_ENV + ' DB=' + (process.env.DATABASE_URL ? 'set' : 'MISSING'));

// Handle unhandled promise rejections to prevent silent crashes
process.on('unhandledRejection', (reason) => {
  console.error('[startup] Unhandled promise rejection:', reason);
});

// Connect to database then run migrations
connectDB().then(() => runMigrations()).catch(err => {
  console.error('[startup] Migration failed:', err);
});

// Initialize job fetching cron job
initializeJobFetchCron();

// Start server
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
