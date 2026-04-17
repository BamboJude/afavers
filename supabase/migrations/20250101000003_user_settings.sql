-- Per-user search configuration (keywords + locations used by the fetch-jobs Edge Function).
-- Ported from server/src/db/migrations/003_user_settings.sql and 004_add_language.sql.

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id    INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  keywords   TEXT NOT NULL DEFAULT 'consulting,beratung,nachhaltigkeit,umwelt,gis,energy',
  locations  TEXT NOT NULL DEFAULT 'Düsseldorf,Köln,Essen,Bochum,Dortmund',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Language detection column (populated by the fetch-jobs Edge Function).
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_language ON public.jobs(language);
