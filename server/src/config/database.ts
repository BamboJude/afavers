import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export const connectDB = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log('📅 Server time:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Make sure DATABASE_URL is set in your .env file');
    process.exit(1);
  }
};

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});
