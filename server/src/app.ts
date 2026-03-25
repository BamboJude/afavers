import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import newsRoutes from './routes/news.routes.js';
import adminRoutes from './routes/admin.routes.js';
import contactRoutes from './routes/contact.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import werkstudentRoutes from './routes/werkstudent.routes.js';
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

// CORS — allow web, Capacitor iOS, browser extensions, and local dev
const ALLOWED_ORIGINS = [
  env.CLIENT_URL,
  'https://afavers.online',
  'https://www.afavers.online',
  'https://afavers-client.vercel.app',
  'capacitor://localhost',  // Capacitor iOS app
  'http://localhost:5173',  // Vite dev server
  'http://localhost:5174',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    // Allow browser extensions (Chrome/Firefox/Edge)
    if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://') || origin.startsWith('ms-browser-extension://')) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
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
app.use('/api/news', newsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/werkstudent', werkstudentRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
