import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Enable SSL for Supabase or any remote DATABASE_URL (not localhost)
const dbUrl = process.env.DATABASE_URL || '';
const isRemoteDB = dbUrl.includes('supabase') || dbUrl.includes('railway') ||
  (process.env.NODE_ENV === 'production' && !dbUrl.includes('localhost'));

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: dbUrl,
  ssl: isRemoteDB ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10s — allows for Railway→Supabase cross-region latency
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

// Handle pool errors — log but don't crash; pg will remove broken connections
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});
