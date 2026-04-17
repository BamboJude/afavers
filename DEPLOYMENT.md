# Deployment

This project is now fully Vercel + Supabase. The previous Railway/cPanel/FTP
pipeline (and the Express backend it hosted) has been retired.

For deployment instructions see **[`VERCEL_SUPABASE_SETUP.md`](./VERCEL_SUPABASE_SETUP.md)**.

In short:

1. Push to GitHub.
2. Connect the repo to Vercel; it builds `client/` via `vercel.json`.
3. Apply every SQL file under `supabase/migrations/` (in filename order) via
   the Supabase SQL editor.
4. Deploy the Edge Functions in `supabase/functions/` with `supabase functions deploy`.
5. Configure the `pg_cron` schedule via `supabase/migrations/20260414_schedule_fetch_jobs.sql`.
