import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/database.js';
import { initializeJobFetchCron } from './jobs/jobFetchCron.js';

// Connect to database
connectDB();

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
