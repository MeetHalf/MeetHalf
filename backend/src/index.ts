import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import groupsRouter from './routes/groups';
import membersRouter from './routes/members';
import mapsRouter from './routes/maps';
import { mapsRateLimiter } from './middleware/rateLimit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Security middlewares
app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/healthz', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/groups', groupsRouter);
app.use('/members', membersRouter);
app.use('/maps', mapsRateLimiter, mapsRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Route not found',
  });
});

// Error handler
interface AppError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    details: err.details,
  });
});

// Export app for testing
export default app;

// Guard: do not start server in test mode
if (process.env.NODE_ENV === 'test') {
  // Test mode, skip server startup
} else {
  // Start server only in non-test environments
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/healthz`);
  });
}

