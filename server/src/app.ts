import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app: Application = express();

// HTTPS redirect (production only — Railway terminates SSL and sets x-forwarded-proto)
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Security headers
app.use(helmet());

// CORS — allow web, Capacitor iOS, and local dev
const ALLOWED_ORIGINS = [
  env.CLIENT_URL,           // https://afavers.com
  'capacitor://localhost',  // Capacitor iOS app
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// Body parsing with size limits
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Request logging in development
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    build: process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 7) || 'local',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
