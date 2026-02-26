-- login_attempts: DB-backed lockout (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS login_attempts (
  email VARCHAR(254) PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- token_blacklist: revoked JWT tokens stored until their natural expiry
CREATE TABLE IF NOT EXISTS token_blacklist (
  token_hash CHAR(64) PRIMARY KEY, -- SHA-256 hex of the raw token
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup and cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
