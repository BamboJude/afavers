# Job Tracker Backend API

Express.js + TypeScript backend for the job tracking platform.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=your-supabase-connection-string
JWT_SECRET=generate-a-random-32-char-string
ADZUNA_APP_ID=your-adzuna-app-id
ADZUNA_APP_KEY=your-adzuna-app-key
CLIENT_URL=http://localhost:5173
```

### 3. Set Up Database

Once you have your Supabase database connection string:

```bash
# Connect to your database and run the migration
psql "your-connection-string" < src/db/migrations/001_initial_schema.sql
```

Or use a GUI tool like pgAdmin or Supabase's SQL editor to run the SQL file.

### 4. Run Development Server

```bash
npm run dev
```

The server will start on [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Register new user (for initial setup)

### Health Check

- `GET /health` - Server health status

## Creating your first user

No default account is seeded. Sign up through the web app or create a user in the Supabase dashboard (Authentication → Users), then promote to admin by setting `is_admin = TRUE` on that row.

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── middleware/       # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript types
├── utils/           # Utility functions
├── jobs/            # Cron jobs
├── db/              # Database migrations
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT tokens (min 32 chars) |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `ADZUNA_APP_ID` | No | Adzuna API app ID |
| `ADZUNA_APP_KEY` | No | Adzuna API app key |
| `BUNDESAGENTUR_API_KEY` | No | Bundesagentur API key (if required) |
| `CLIENT_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:3000/health

# Login (replace with real credentials)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

### Using Thunder Client / Postman

Import the API endpoints and test them with your API client of choice.

## Next Steps

After setting up the backend:

1. Test authentication endpoints
2. Implement job fetching services
3. Add job management endpoints
4. Set up cron jobs for automated fetching
5. Deploy to Railway/Render
