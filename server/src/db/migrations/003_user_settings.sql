-- Per-user search configuration (keywords and locations for job fetching)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  keywords  TEXT NOT NULL DEFAULT 'consulting,beratung,nachhaltigkeit,umwelt,gis,energy',
  locations TEXT NOT NULL DEFAULT 'Düsseldorf,Köln,Essen,Bochum,Dortmund',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
