import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, 'migrations');

  // Ensure tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const already = await pool.query(
      `SELECT 1 FROM schema_migrations WHERE filename = $1`,
      [file],
    );
    if (already.rowCount && already.rowCount > 0) continue;

    const sql = await readFile(join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query(
      `INSERT INTO schema_migrations (filename) VALUES ($1)`,
      [file],
    );
    console.log(`✅ Migration applied: ${file}`);
  }
}
