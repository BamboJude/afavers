# Vercel + Supabase setup

This project is being moved to a free-friendly setup:

- Vercel serves the React frontend.
- Supabase provides Auth, PostgreSQL, and direct app data access.
- The old Express API remains in the repo while the remaining backend-only features move to Supabase Edge Functions.

## Vercel frontend

The root `vercel.json` is configured for the workspace build:

```bash
npm run build --workspace=client
```

In Vercel, set these environment variables for the frontend project:

```bash
VITE_SUPABASE_URL=https://mcaletfngisgofppfugr.supabase.co
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
SUPABASE_URL=https://mcaletfngisgofppfugr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Backend migration status

Already moved to Supabase from the browser:

- Supabase Auth
- jobs, dashboard stats, job detail, kanban/status overlays
- settings/setup
- public jobs
- Werkstudent saved/applied state

Still needs Supabase Edge Functions or another replacement:

- Werkstudent live search
- news proxy
- gamification widget
- admin/contact inbox
- automatic scheduled job fetching
