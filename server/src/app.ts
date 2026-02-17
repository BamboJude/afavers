import express, { Application } from 'express';
import cors from 'cors';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app: Application = express();

// Middleware
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
