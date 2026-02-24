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

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand (auth + language preference) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (7-day tokens) |
| Automation | node-cron (every 2 hours) |
| Hosting | Railway (API) + cPanel (frontend) |

---

## Project structure

```
afavers/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Dashboard, Jobs, Kanban, Settings...
│   │   ├── services/          # API layer
│   │   ├── store/             # Zustand stores (auth, language)
│   │   ├── i18n/              # EN/DE translations
│   │   └── types/
│   └── public/                # .htaccess, robots.txt, sitemap.xml
│
└── server/                    # Express backend
    └── src/
        ├── config/
        ├── middleware/         # JWT auth
        ├── models/             # Database queries
        ├── routes/             # API routes
        ├── services/
        │   └── fetchers/       # Bundesagentur + Adzuna fetchers
        │                       # Language detection (stop-word heuristic)
        ├── jobs/               # Cron job setup
        ├── utils/
        └── db/
            └── migrations/     # SQL migration files
```

---

## Running locally

### Prerequisites

- Node.js 18+
- PostgreSQL database (or a free [Supabase](https://supabase.com) project)
- Adzuna API credentials (free at [developer.adzuna.com](https://developer.adzuna.com))

### 1. Clone

```bash
git clone https://github.com/BamboJude/afavers.git
cd afavers
```

### 2. Backend setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your values (see table below)
npm run dev
# Runs on http://localhost:3000
```

Run the database migrations in order:

```bash
psql "$DATABASE_URL" < src/db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" < src/db/migrations/002_user_jobs.sql
psql "$DATABASE_URL" < src/db/migrations/003_user_settings.sql
psql "$DATABASE_URL" < src/db/migrations/004_add_language.sql
```

### 3. Frontend setup

```bash
cd client
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:3000
npm run dev
# Opens at http://localhost:5173
```

### 4. Create your account

Visit `http://localhost:5173/register` and sign up.

---

## Environment variables

**`server/.env`**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `ADZUNA_APP_ID` | Yes | Adzuna API app ID |
| `ADZUNA_APP_KEY` | Yes | Adzuna API key |
| `CLIENT_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |
| `PORT` | No | Server port (default: 3000) |

**`client/.env`**

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API URL |

---

## Deploying to production

### Backend (Railway)

1. Push to GitHub
2. Create a project at [railway.app](https://railway.app) and connect your repo
3. Add environment variables in the Railway dashboard
4. Railway auto-deploys on every push to `main`

### Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Run all four migration files via the SQL Editor

### Frontend (cPanel / any static host)

```bash
cd client
echo "VITE_API_URL=https://your-app.railway.app" > .env.production
npm run build
# Upload dist/ to your host's public_html
```

The `public/.htaccess` file in this repo handles SPA routing on Apache automatically.

---

## Customising the job search

Edit `server/src/services/fetchers/bundesagentur.fetcher.ts` to change your keywords, locations, and search radius. The same applies to `adzuna.fetcher.ts`.

---

## What I learned building this

- Designing a relational schema where jobs are shared globally but status/notes are per-user (via a `user_jobs` join table)
- Building a language detection heuristic using stop-word frequency — no external library needed
- Setting up automated background tasks with node-cron and keeping a free-tier backend alive with health-check pings
- Deploying a full-stack app across three separate platforms (cPanel, Railway, Supabase) and wiring them together
- The value of building something you actually use every day — every bug hurts, which means every fix actually matters

---

## Status

This is a personal project, actively used and occasionally improved. It's not polished commercial software — it's a working tool built in real conditions. Contributions, suggestions, and feedback are welcome.

---

## License

MIT — free to use, fork, and deploy your own instance.

---

*Built to solve a real problem: job hunting in Germany without losing your mind.*
