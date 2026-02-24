# afavers

**Automated job tracker for sustainability, GIS, and environmental careers in NRW, Germany.**

Jobs are fetched from [Bundesagentur für Arbeit](https://jobsuche.api.bund.dev/) every 2 hours automatically. You review them, save the ones you like, and track your applications through a Kanban board.

**Live at [afavers.com](https://afavers.com)**

---

## What it does

- Fetches 1,000+ jobs every 2 hours from Bundesagentur für Arbeit
- Keywords: GIS, Umwelt, Klimaschutz, Energie, Nachhaltigkeit, Sustainability, Consulting, Beratung
- Locations: Düsseldorf, Köln, Essen, Bochum, Dortmund and surrounding NRW
- One-click **Save** or **Hide** on each job card — triage fast
- Full **Kanban board** (Saved → Applied → Interviewing → Offered / Rejected)
- Per-user accounts — each user has their own application tracking
- Notes on every job, applied date tracking

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (7-day tokens) |
| Hosting | Railway (API) + cPanel (frontend) |
| Cron | node-cron every 2h |

---

## Running locally

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or [Supabase free tier](https://supabase.com))

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
# Edit .env with your values
```

**`server/.env`:**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key-at-least-32-characters
CLIENT_URL=http://localhost:5173
```

Run the database migrations:
```bash
psql $DATABASE_URL < src/db/migrations/001_initial_schema.sql
psql $DATABASE_URL < src/db/migrations/002_user_jobs.sql
```

Start the server:
```bash
npm run dev
```

### 3. Frontend setup

```bash
cd client
npm install
cp .env.example .env
```

**`client/.env`:**
```env
VITE_API_URL=http://localhost:3000
```

```bash
npm run dev
# Opens at http://localhost:5173
```

### 4. Create your first account

Visit `http://localhost:5173/register` and sign up.

---

## Deploying to production

### Backend (Railway)

1. Push to GitHub
2. Create a new project at [railway.app](https://railway.app)
3. Connect your GitHub repo
4. Add environment variables:
   ```
   DATABASE_URL=<your Supabase connection string>
   JWT_SECRET=<strong random secret>
   CLIENT_URL=https://yourdomain.com
   NODE_ENV=production
   ```
5. Railway auto-deploys on every push to `main`

### Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run both migration files:
   - `server/src/db/migrations/001_initial_schema.sql`
   - `server/src/db/migrations/002_user_jobs.sql`

### Frontend (cPanel / any static host)

```bash
cd client
echo "VITE_API_URL=https://your-app.railway.app" > .env.production
npm run build
# Upload dist/ to your host
```

Add `.htaccess` for SPA routing on Apache:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Customising the job search

Edit `server/src/services/fetchers/bundesagentur.fetcher.ts` to change keywords, locations, and search radius.

---

## License

MIT — free to use, fork, and deploy your own instance.

---

*Built with Node.js, React, and PostgreSQL. Inspired by the need to track green jobs without manually checking job boards every day.*
