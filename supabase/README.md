# Supabase Edge Functions

Functions in this directory replace the old Express endpoints needed by the frontend:

- `fetch-jobs`: fetches Bundesagentur and Adzuna jobs and upserts them into `jobs`
- `werkstudent-search`: live Werkstudent search proxy for Bundesagentur
- `news`: Tagesschau news proxy

Deploy:

```bash
supabase link --project-ref mcaletfngisgofppfugr
supabase functions deploy fetch-jobs --no-verify-jwt
supabase functions deploy werkstudent-search
supabase functions deploy news --no-verify-jwt
```

`fetch-jobs` uses `CRON_SECRET` for scheduled calls. `news` is public because the news page can be loaded before a user signs in.

Required secrets:

```bash
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BUNDESAGENTUR_API_KEY
ADZUNA_APP_ID
ADZUNA_APP_KEY
CRON_SECRET
```

After deploying `fetch-jobs`, run `supabase/migrations/20260414_schedule_fetch_jobs.sql` in the Supabase SQL editor, replacing `YOUR_CRON_SECRET` first.
