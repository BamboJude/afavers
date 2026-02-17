# Job Tracking Platform

A full-stack job tracking application that automatically fetches relevant jobs from multiple sources and helps manage the job application process.

## Features

- **Automated Job Fetching**: Fetch jobs every 2 hours from:
  - Bundesagentur für Arbeit API
  - Adzuna API
  - greenjobs.de (web scraping)
- **Job Management**: Track applications through the entire process
- **Kanban Board**: Drag-and-drop interface for managing application status
- **Analytics Dashboard**: Visualize job search progress and metrics
- **Single User Authentication**: JWT-based secure login

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Zustand (state management)
- React Beautiful DnD (Kanban)
- Recharts (charts)

**Backend:**
- Node.js 18+ + TypeScript
- Express.js
- PostgreSQL
- JWT Authentication
- Node-cron (scheduled jobs)

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── scripts/         # Utility scripts
└── docs/            # Documentation
```

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase recommended for free tier)
- API credentials:
  - Bundesagentur für Arbeit API
  - Adzuna API (free tier available at https://developer.adzuna.com/)

### Environment Variables

See `.env.example` for required environment variables.

## Development

```bash
# Start backend
cd server
npm install
npm run dev

# Start frontend (new terminal)
cd client
npm install
npm run dev
```

## Deployment

- **Backend**: Railway.app or Render.com (free tier)
- **Frontend**: cPanel /public_html via FTP
- **Database**: Supabase (free tier)

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## License

MIT

## Author

Built for personal job search management
