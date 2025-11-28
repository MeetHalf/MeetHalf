import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
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
// CORS configuration - allow frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  // Add container frontend origin if needed
  process.env.FRONTEND_ORIGIN,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true, // Fallback to allow all in dev
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/healthz', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MeetHalf API Documentation',
}));

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
  // Use 0.0.0.0 to allow external connections (e.g., from containers)
  // Use 127.0.0.1 for local development security
  const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/healthz`);
  });
}

