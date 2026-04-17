# Quick Start

Get the afavers frontend running locally in ~5 minutes. This project is
Supabase + React only — no backend server to run.

## Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine). Note its **Project URL** and **anon key**.

---

## 1. Clone and install

```bash
git clone https://github.com/BamboJude/afavers.git
cd afavers
npm install
```

## 2. Apply the database schema

Open the Supabase SQL editor and run every file under `supabase/migrations/`
in filename order (top to bottom). This creates the `users`, `jobs`,
`user_jobs`, `user_settings`, gamification, and admin tables, plus the RLS
policies and admin RPC functions.

## 3. Configure the frontend

```bash
cd client
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 4. Run the dev server

```bash
# from the repo root
npm run dev
```

The app opens at `http://localhost:5173`.

## 5. Create your account

Use the in-app **Sign up** form. Supabase Auth creates the `auth.users` row; a
trigger (`handle_new_auth_user`) automatically provisions the matching
`public.users` row and default `user_settings` entries.

To promote yourself to admin, run in the Supabase SQL editor:

```sql
UPDATE public.users SET is_admin = TRUE WHERE email = 'you@example.com';
```

---

## Next steps

- Configure Edge Function secrets and deploy `fetch-jobs`, `werkstudent-search`, `news`
  (see `VERCEL_SUPABASE_SETUP.md`).
- Schedule automated fetching via `supabase/migrations/20260414_schedule_fetch_jobs.sql`
  (remember to substitute `YOUR_CRON_SECRET`).
- Deploy the client to Vercel — `vercel.json` is already wired for the
  `client/` workspace build.
