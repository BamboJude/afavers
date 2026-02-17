# Quick Start Guide

Get the job tracker running locally in 15 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (use Supabase free tier)
- Code editor (VSCode recommended)

---

## 1. Clone & Install (2 min)

```bash
cd /Users/bambojude/Desktop/afavers

# Install server dependencies
cd server
npm install
```

---

## 2. Set Up Database (5 min)

### Option A: Supabase (Recommended - Free)

1. Go to [supabase.com](https://supabase.com)
2. Create new project: "job-tracker-dev"
3. Copy connection string from Settings → Database
4. In Supabase SQL Editor, run:
   ```sql
   -- Paste contents of server/src/db/migrations/001_initial_schema.sql
   ```

### Option B: Local PostgreSQL

```bash
# Create database
createdb jobtracker

# Run migration
psql jobtracker < server/src/db/migrations/001_initial_schema.sql
```

---

## 3. Configure Environment (2 min)

Create `server/.env`:

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=your-supabase-or-local-connection-string
JWT_SECRET=any-random-string-for-development-min-32-chars
CLIENT_URL=http://localhost:5173

# Optional (for job fetching)
ADZUNA_APP_ID=your-adzuna-id
ADZUNA_APP_KEY=your-adzuna-key
```

Quick JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Start Backend (1 min)

```bash
cd server
npm run dev
```

✅ Should see:
```
✅ Database connected successfully
🚀 Server running on port 3000
```

Test it:
```bash
curl http://localhost:3000/health
# Should return: {"status":"OK", ...}
```

---

## 5. Test Authentication (2 min)

```bash
# Login with default credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"changeme123"}'
```

✅ Should return a JWT token:
```json
{
  "user": {"id":1,"email":"admin@example.com"},
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

---

## 6. Next Steps (3 min)

### Option A: Build Frontend (coming next)

```bash
# Create client (we'll do this together)
npm create vite@latest client -- --template react-ts
cd client
npm install
# ... configure and start
```

### Option B: Test API with Postman/Thunder Client

Import these endpoints:
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Create user
- `GET /health` - Health check

---

## Common Issues

### "Database connection failed"
- Check `DATABASE_URL` in `.env`
- Verify Supabase project is running
- Test connection string with `psql`

### "Port 3000 already in use"
- Change `PORT=3001` in `.env`
- Or kill process: `lsof -ti:3000 | xargs kill`

### "JWT_SECRET required"
- Make sure `.env` file exists in `server/` directory
- Check it has `JWT_SECRET=...` line

---

## Default Credentials

After running migrations:
- **Email**: admin@example.com
- **Password**: changeme123

⚠️ Change immediately in production!

---

## What's Running?

| Service | URL | Status |
|---------|-----|--------|
| Backend API | http://localhost:3000 | 🟢 |
| Health Check | http://localhost:3000/health | 🟢 |
| Database | Supabase/Local | 🟢 |

---

## Development Workflow

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend (after setup)
cd client
npm run dev

# Make changes, auto-reload happens
```

---

## Next: Build Features

Now that the backend is running, we'll add:

1. ✅ Authentication - DONE
2. ⏳ Job fetching services
3. ⏳ Job management API
4. ⏳ Frontend React app
5. ⏳ Deployment to production

---

*Ready to continue? Let me know and I'll build the job fetching services!*
