-- Add language detection column to jobs table
-- Detected automatically when jobs are fetched (simple heuristic)
-- Values: 'en' (English), 'de' (German), NULL (unknown)

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_language ON jobs(language);
