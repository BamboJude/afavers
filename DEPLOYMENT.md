# Deployment Guide

Complete guide for deploying the Job Tracker platform.

## Architecture

- **Frontend**: React app → cPanel /public_html (afavers.com)
- **Backend**: Node.js API → Railway/Render (free tier)
- **Database**: PostgreSQL → Supabase (free tier)

## Prerequisites

- [ ] Supabase account with PostgreSQL database created
- [ ] Railway.app or Render.com account
- [ ] Adzuna API credentials
- [ ] cPanel FTP access to afavers.com

---

## Step 1: Database Setup (Supabase)

### 1.1 Create Database

1. Go to [https://supabase.com](https://supabase.com)
2. Create new project: "job-tracker"
3. Wait for provisioning (~2 min)
4. Go to **Settings → Database**
5. Copy **Connection String (URI)**

### 1.2 Run Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy contents of `server/src/db/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Verify: "Success. No rows returned" ✓

### 1.3 Save Credentials

Save your connection string (you'll need it for Railway):
```
postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
```

---

## Step 2: Backend Deployment (Railway)

### 2.1 Create Railway Project

1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your GitHub account
6. Select the `afavers` repository (push to GitHub first if needed)

### 2.2 Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=your-supabase-connection-string
JWT_SECRET=generate-random-32-char-string
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
CLIENT_URL=https://afavers.com
```

To generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Configure Build Settings

In Railway, go to **Settings**:

- **Root Directory**: `server`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 2.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 min)
3. Copy your deployment URL: `https://your-app.up.railway.app`
4. Test health endpoint: `https://your-app.up.railway.app/health`

---

## Step 3: Frontend Setup & Deployment

### 3.1 Create Client Project

```bash
# Create React app with Vite
npm create vite@latest client -- --template react-ts
cd client
npm install

# Install dependencies
npm install react-router-dom zustand axios @tanstack/react-query
npm install tailwindcss postcss autoprefixer -D
npm install react-beautiful-dnd recharts date-fns

# Initialize Tailwind
npx tailwindcss init -p
```

### 3.2 Configure Environment Variables

Create `client/.env.production`:

```env
VITE_API_URL=https://your-app.up.railway.app
```

### 3.3 Build for Production

```bash
cd client
npm run build
```

This creates a `dist/` folder with your production-ready React app.

### 3.4 Deploy to cPanel

#### Option A: Manual FTP Upload

1. Connect to FTP: `ftp.afavers.com`
2. Navigate to `/public_html`
3. Delete old files (they're backed up in `../afavers-old-geoconvert/`)
4. Upload entire contents of `client/dist/` folder
5. Ensure `.htaccess` is uploaded (enables SPA routing)

#### Option B: Automated with VSCode SFTP

1. Install "SFTP" extension in VSCode
2. Create `.vscode/sftp.json`:

```json
{
  "name": "Afavers",
  "host": "ftp.afavers.com",
  "protocol": "ftp",
  "port": 21,
  "username": "your-username",
  "password": "your-password",
  "remotePath": "/public_html",
  "uploadOnSave": false,
  "ignore": [
    ".vscode",
    ".git",
    "node_modules"
  ]
}
```

3. Right-click `client/dist` → "SFTP: Upload Folder"

### 3.5 Verify Deployment

1. Visit https://afavers.com
2. You should see the React app
3. Test login with default credentials:
   - Email: `admin@example.com`
   - Password: `changeme123`

---

## Step 4: Enable Automated Job Fetching

The cron job is configured to run every 2 hours automatically when the backend starts.

### Keep Railway App Awake (Free Tier)

Railway free tier apps sleep after inactivity. To keep it awake:

1. Go to [https://cron-job.org](https://cron-job.org) (free)
2. Create account
3. Add new cron job:
   - **URL**: `https://your-app.up.railway.app/health`
   - **Schedule**: Every 14 minutes
   - This keeps your app active

---

## Step 5: Post-Deployment

### 5.1 Change Default Password

1. Login with default credentials
2. Create new user via API or update database directly
3. Delete default admin user

### 5.2 Monitor Logs

**Railway Dashboard:**
- View logs in real-time
- Check for errors in job fetching
- Monitor API usage

**Supabase Dashboard:**
- Check database size (free tier: 500MB)
- Monitor active connections
- View job count growth

### 5.3 Test Job Fetching

1. Check Railway logs for: `🔄 Starting job fetch...`
2. Verify jobs appear in Supabase database
3. Refresh frontend to see new jobs

---

## Deployment Checklist

Before going live:

- [ ] Database migration run successfully
- [ ] Backend deployed to Railway with all env vars
- [ ] Backend health endpoint returns 200 OK
- [ ] Frontend built and uploaded to cPanel
- [ ] Can login at https://afavers.com
- [ ] API requests work (check browser console)
- [ ] Cron job running (check Railway logs)
- [ ] Default password changed
- [ ] Keep-alive cron job set up

---

## Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify all environment variables are set
- Test database connection string

### Frontend shows blank page
- Check browser console for errors
- Verify `VITE_API_URL` is correct in `.env.production`
- Ensure `.htaccess` is uploaded for SPA routing

### CORS errors
- Verify `CLIENT_URL` in backend matches your domain
- Check Railway logs for CORS errors

### Jobs not fetching
- Check Railway logs for cron job execution
- Verify API credentials are correct
- Test API endpoints manually (Adzuna, etc.)

### Database connection fails
- Verify Supabase connection string is correct
- Check if IP whitelisting is required (Supabase allows all by default)
- Ensure database is not paused

---

## Costs

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free Tier | $0/month (500MB database) |
| Railway | Free Tier | $0/month ($5 credit/month, ~500 hours) |
| cPanel Hosting | Existing | Already paid |
| **Total** | | **$0/month** |

### Upgrade Recommendations

If you exceed free tier limits:

- **Railway**: $5/month for Hobby plan (better uptime)
- **Supabase**: $25/month for Pro plan (8GB database)

---

## Maintenance

### Weekly
- Check job count in database
- Verify cron job is running
- Monitor API rate limits

### Monthly
- Review Railway usage
- Check Supabase database size
- Archive old jobs if needed

### As Needed
- Update dependencies (`npm update`)
- Backup database
- Review and optimize job fetching logic

---

## Rollback Plan

If something goes wrong:

1. **Frontend**: Upload backup from `../afavers-old-geoconvert/`
2. **Backend**: Redeploy previous version in Railway
3. **Database**: Restore from Supabase backup (Settings → Database → Backups)

---

## Support

- **Railway**: [railway.app/help](https://railway.app/help)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Adzuna API**: [developer.adzuna.com](https://developer.adzuna.com)

---

*Last updated: 2026-02-17*
