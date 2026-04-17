# Vercel + Supabase setup

This project runs entirely on Vercel + Supabase:

- Vercel serves the React frontend.
- Supabase provides Auth, PostgreSQL, direct app data access, and Edge Functions for background work.
- There is no standalone backend server — the former Express stack has been retired.

## Vercel frontend

The root `vercel.json` is configured for the workspace build:

```bash
npm run build --workspace=client
```

In Vercel, set these environment variables for the frontend project:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then deploy from GitHub or with the CLI:

```bash
vercel --prod
```

## Supabase Auth URLs

In Supabase Dashboard > Authentication > URL Configuration:

```bash
Site URL=https://your-vercel-domain
```

Add redirect URLs for local and production:

```bash
http://localhost:5173/**
https://your-vercel-domain/**
```

## Supabase admin env

Set these only for local admin scripts or Supabase Edge Functions. Never expose the service role key in frontend code.

```bash
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
BUNDESAGENTUR_API_KEY=jobboerse-jobsuche
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
CRON_SECRET=your-random-cron-secret
```

## Supabase Edge Functions

Install the Supabase CLI, then link and deploy:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set \
  SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
  SUPABASE_ANON_KEY=your-supabase-anon-key \
  SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key \
  BUNDESAGENTUR_API_KEY=jobboerse-jobsuche \
  ADZUNA_APP_ID=your-adzuna-app-id \
  ADZUNA_APP_KEY=your-adzuna-app-key \
  CRON_SECRET=your-random-cron-secret
supabase functions deploy fetch-jobs --no-verify-jwt
supabase functions deploy werkstudent-search
supabase functions deploy news --no-verify-jwt
```

`fetch-jobs` is protected by `CRON_SECRET` for scheduled calls. `news` is public so the news page can load without a user session.

To schedule automatic fetching, open `supabase/migrations/20260414_schedule_fetch_jobs.sql`, replace `YOUR_CRON_SECRET`, and run it in the Supabase SQL editor.

## Backend topology

Everything that used to live in the Express API now runs on Supabase:

| Feature                              | Where it runs now                                |
|--------------------------------------|--------------------------------------------------|
| Auth                                 | Supabase Auth                                    |
| Jobs, dashboard stats, kanban        | Browser → Supabase via `@supabase/supabase-js`   |
| User settings                        | Browser → Supabase                               |
| Werkstudent saved state              | Browser → Supabase                               |
| Gamification widget + progression    | Browser → Supabase RPCs                          |
| Scheduled job fetching               | Edge Function `fetch-jobs` + `pg_cron`           |
| Live Werkstudent search              | Edge Function `werkstudent-search`               |
| News proxy                           | Edge Function `news`                             |
| Admin dashboards                     | Browser → `admin_*` RPC functions (SECURITY DEFINER) |
| Contact inbox                        | Browser → Supabase; admin reads via RPCs         |
