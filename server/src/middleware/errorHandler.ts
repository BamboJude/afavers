import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // In production, hide internal 500 details to avoid leaking implementation info
  const message = isProd && statusCode >= 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  res.status(statusCode).json({
    error: message,
    ...(!isProd && { stack: err.stack }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
};
