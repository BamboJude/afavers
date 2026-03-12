-- Add is_admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant admin to the main admin account
UPDATE users SET is_admin = TRUE WHERE email = 'admin@afavers.com';
