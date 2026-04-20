# Supabase Edge Functions

Functions in this directory handle the backend tasks used by the frontend:

- `fetch-jobs`: fetches Bundesagentur and Adzuna jobs and upserts them into `jobs`
- `job-alerts`: emails opted-in users about fresh high-match jobs
- `werkstudent-search`: live Werkstudent search proxy for Bundesagentur
- `news`: Tagesschau news proxy

Deploy:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy fetch-jobs --no-verify-jwt
supabase functions deploy job-alerts --no-verify-jwt
supabase functions deploy werkstudent-search
supabase functions deploy news --no-verify-jwt
```

`fetch-jobs` and `job-alerts` use `CRON_SECRET` for scheduled calls. `news` is public because the news page can be loaded before a user signs in.

Required secrets:

```bash
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
BUNDESAGENTUR_API_KEY
ADZUNA_APP_ID
ADZUNA_APP_KEY
CRON_SECRET
RESEND_API_KEY
ALERT_EMAIL_FROM
```

After deploying `fetch-jobs`, run `supabase/migrations/20260414_schedule_fetch_jobs.sql` in the Supabase SQL editor, replacing `YOUR_CRON_SECRET` first.

For priority job email alerts:

1. Run `supabase/migrations/20260420_job_email_alerts.sql`.
2. Deploy `job-alerts`.
3. Set `RESEND_API_KEY`; optionally set `ALERT_EMAIL_FROM`, for example `Afavers <notifications@afavers.online>`.
4. Run `supabase/migrations/20260420_schedule_job_alerts.sql`, replacing `YOUR-PROJECT-REF` and `YOUR_CRON_SECRET` first.
