-- Initial schema for afavers.
-- Ported from the retired Express migration server/src/db/migrations/001_initial_schema.sql.
-- The `users` table keeps the integer primary key that the rest of the schema
-- (user_jobs, user_settings, xp_events, etc.) references. A later migration
-- bridges it to Supabase Auth via `auth_user_id`.

CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.jobs (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    company VARCHAR(255),
    location VARCHAR(255),
    description TEXT,
    url TEXT,
    source VARCHAR(50) NOT NULL,
    posted_date DATE,
    deadline DATE,
    salary VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    notes TEXT,
    applied_date DATE,
    follow_up_date DATE,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES public.jobs(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON public.jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_external_id ON public.jobs(external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_hidden ON public.jobs(is_hidden);
CREATE INDEX IF NOT EXISTS idx_activity_log_job_id ON public.activity_log(job_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
