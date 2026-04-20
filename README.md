# afavers — Automated Job Tracker

**Live at [afavers.com](https://afavers.com)**

---

## Why I built this

Job hunting is exhausting — especially when you're searching in a second language, across multiple websites, while trying to stay on top of what you've applied to, what's still pending, and what you've already dismissed.

I was doing all of this manually: browser tabs everywhere, notes scattered across notebooks and phone memos, missing deadlines, re-discovering listings I'd already seen and rejected. It was noise, and it was draining time I could spend actually preparing for applications.

So I built **afavers** — a personal job tracking platform that does the searching for me and keeps everything in one place.

It's not a perfect product. It's a project — built to solve a real problem I face daily, while practising the skills I want to grow professionally. If it helps someone else going through the same thing, even better.

---

## What it does

- **Fetches jobs automatically every 2 hours** from the German Federal Employment Agency (Bundesagentur für Arbeit) and Adzuna, filtered by your own keywords and locations
- **English jobs filter** — automatically detects the language of each job description so you can browse English-language listings separately
- **Kanban board** — drag jobs through your personal pipeline: Saved → Applied → Interviewing → Offered / Rejected
- **Job detail view** — read the full description, set your status, add private notes, track your applied date and follow-up date
- **Dashboard overview** — see at a glance how many new jobs are waiting, how many you've applied to, how many interviews are in progress
- **EN / DE UI** — the interface itself is available in English and German
- **Search and filter** — keyword search across all listings, filter by status, sort by date

---

## The problem it solves

When you're job hunting in Germany as a foreigner, or in a niche field like sustainability, GIS, or environmental consulting, relevant jobs are spread across many platforms. You end up:

- Checking the same job boards every day manually
- Losing track of which jobs you've already seen or applied to
- Missing deadlines because you saved a link somewhere and forgot about it
- Having no clear picture of where you are in your overall job search

afavers fixes this by pulling everything into one dashboard automatically, letting you triage fast (save or hide), and giving you a pipeline view of every active application.

---

## Tech stack

| Layer            | Technology                                          |
|------------------|-----------------------------------------------------|
| Frontend         | React 18 + TypeScript + Vite + Tailwind CSS         |
| State            | Zustand (auth + language preference)                |
| Data / API       | Supabase PostgreSQL (direct via `@supabase/supabase-js`) |
| Auth             | Supabase Auth                                       |
| Background jobs  | Supabase Edge Functions + `pg_cron`                 |
| Hosting (web)    | Vercel                                              |
| Browser extension| Plain Chrome/Firefox MV3 extension talking to Supabase |

There is **no separate backend server**. The Express API was retired once the frontend and the extension both moved directly onto Supabase. All server-side logic now lives in Supabase Edge Functions (`supabase/functions/`) and Postgres RPC functions.

---

## Project structure

```
afavers/
├── client/                       # React frontend (Vite) — Vercel-deployed
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Dashboard, Jobs, Kanban, Settings, Admin, ...
│   │   ├── services/             # Supabase queries + RPC wrappers
│   │   ├── store/                # Zustand stores (auth, language)
│   │   ├── i18n/                 # EN/DE translations
│   │   └── types/
│   └── public/                   # .htaccess, robots.txt, sitemap.xml
│
├── supabase/
│   ├── migrations/               # SQL migrations applied via Supabase SQL editor
│   ├── manual/                   # SQL examples that require deployment-specific edits
│   └── functions/
│       ├── _shared/              # Shared helpers (cors, jobs, language detect)
│       ├── fetch-jobs/           # Bundesagentur + Adzuna fetch (cron/manual)
│       ├── werkstudent-search/   # Live Werkstudent search proxy
│       └── news/                 # Tagesschau news proxy
│
├── extension/                    # Chrome / Firefox MV3 extension (Supabase-direct)
│
├── vercel.json                   # Frontend build config
└── VERCEL_SUPABASE_SETUP.md      # End-to-end deployment guide
```

---

## Running locally

### Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project (PostgreSQL + Auth)
- Adzuna API credentials (free at [developer.adzuna.com](https://developer.adzuna.com)) — only required if you want the Adzuna source

### 1. Clone

```bash
git clone https://github.com/BamboJude/afavers.git
cd afavers
npm install
```

### 2. Apply database migrations

Open the Supabase SQL editor for your project and run the files in `supabase/migrations/` in chronological (filename) order. All files end in `.sql` and are named `YYYYMMDDHHMMSS_*.sql`; run them top-to-bottom.

### 3. Configure the frontend

```bash
cd client
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
```

### 4. Start the dev server

```bash
# from the repo root
npm run dev
# Vite opens at http://localhost:5173
```

### 5. Create your account

Visit `http://localhost:5173` and sign up via Supabase Auth. To promote yourself to admin, run in the Supabase SQL editor:

```sql
UPDATE public.users SET is_admin = TRUE WHERE email = 'you@example.com';
```

### 6. (Optional) Deploy the Edge Functions

See `VERCEL_SUPABASE_SETUP.md` for the full CLI walkthrough. Minimum secrets:

```bash
supabase secrets set \
  SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
  BUNDESAGENTUR_API_KEY=jobboerse-jobsuche \
  ADZUNA_APP_ID=... ADZUNA_APP_KEY=... \
  CRON_SECRET=$(openssl rand -hex 32)
supabase functions deploy fetch-jobs --no-verify-jwt
supabase functions deploy werkstudent-search
supabase functions deploy news --no-verify-jwt
```

To schedule fetches, copy `supabase/manual/schedule_fetch_jobs.example.sql`, replace `YOUR-PROJECT-REF` and `YOUR_CRON_SECRET`, then run it in the SQL editor.

---

## Environment variables

**`client/.env`**

| Variable                | Required | Description                              |
|-------------------------|----------|------------------------------------------|
| `VITE_SUPABASE_URL`     | Yes      | Supabase project URL                     |
| `VITE_SUPABASE_ANON_KEY`| Yes      | Supabase anon key for browser access     |

**Supabase Edge Function secrets** (set via `supabase secrets set`, never in committed files):

| Variable                    | Required | Description                                        |
|-----------------------------|----------|----------------------------------------------------|
| `SUPABASE_URL`              | Yes      | Project URL (server-side)                          |
| `SUPABASE_ANON_KEY`         | Yes      | Anon key (used for user JWT verification)          |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service role key for admin writes                  |
| `BUNDESAGENTUR_API_KEY`     | No       | Defaults to the public `jobboerse-jobsuche` key    |
| `ADZUNA_APP_ID`             | No       | Optional; Adzuna source skipped if missing         |
| `ADZUNA_APP_KEY`            | No       | Optional; Adzuna source skipped if missing         |
| `CRON_SECRET`               | Yes for cron | Shared secret for the `pg_cron` → fetch-jobs call. Manual dashboard fetches use the signed-in user's Supabase session. |

---

## Customising the job search

Per-user keywords and locations live in `public.user_settings`. Change them from the Settings page in the app, or directly in SQL. The Edge Function picks them up on the next cron run.

Default fallback keywords/locations live at the top of `supabase/functions/_shared/jobs.ts`.

---

## What I learned building this

- Designing a relational schema where jobs are shared globally but status/notes are per-user (via a `user_jobs` join table)
- Building a language detection heuristic using stop-word frequency — no external library needed
- Moving a full-stack app onto Supabase-only: RLS instead of a JWT middleware, Edge Functions instead of Express cron jobs, direct `@supabase/supabase-js` calls instead of a REST layer
- Deploying a frontend on Vercel while keeping everything data-adjacent in Supabase
- The value of building something you actually use every day — every bug hurts, which means every fix actually matters

---

## Status

This is a personal project, actively used and occasionally improved. It's not polished commercial software — it's a working tool built in real conditions. Contributions, suggestions, and feedback are welcome.

---

## License

MIT — free to use, fork, and deploy your own instance.

---

*Built to solve a real problem: job hunting in Germany without losing your mind.*
