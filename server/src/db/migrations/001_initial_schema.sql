-- Initial database schema for Job Tracking Platform
-- Run this file to set up the database structure

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table (main table for job listings)
CREATE TABLE IF NOT EXISTS jobs (
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

-- Activity log table (tracks changes to jobs)
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_hidden ON jobs(is_hidden);
CREATE INDEX IF NOT EXISTS idx_activity_log_job_id ON activity_log(job_id);

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function before update
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create initial admin user (password: 'changeme123' - MUST be changed in production)
-- Password hash for 'changeme123' using bcrypt with 10 rounds
INSERT INTO users (email, password_hash)
VALUES ('admin@example.com', '$2b$10$rBV2kVqN8gH7Iy6hKx7yXO8pZqHqH7Iy6hKx7yXO8pZqHqH7Iy6hK')
ON CONFLICT (email) DO NOTHING;

-- Example job data for testing (optional - comment out if not needed)
-- INSERT INTO jobs (external_id, title, company, location, description, url, source, posted_date, salary, status)
-- VALUES
-- ('test_1', 'GIS Analyst', 'Environmental Solutions GmbH', 'Düsseldorf', 'Looking for experienced GIS analyst...', 'https://example.com/job1', 'manual', CURRENT_DATE, '€45,000 - €55,000', 'new'),
-- ('test_2', 'Sustainability Coordinator', 'Green Energy Corp', 'Köln', 'Join our sustainability team...', 'https://example.com/job2', 'manual', CURRENT_DATE, '€40,000 - €50,000', 'new');
