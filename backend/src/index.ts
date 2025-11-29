import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import passport from './lib/passport';
import { swaggerSpec } from './config/swagger';
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import membersRouter from './routes/members';
import mapsRouter from './routes/maps';
import usersRouter from './routes/users';
import { mapsRateLimiter } from './middleware/rateLimit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy - Required for Vercel to correctly detect HTTPS
// This allows Express to trust X-Forwarded-* headers from Vercel's proxy
app.set('trust proxy', true);

// Security middlewares
// Configure Helmet with CSP that allows Swagger UI CDN resources
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          "'unsafe-inline'", // Required for Swagger UI inline scripts
        ],
        styleSrc: [
          "'self'",
          'https://cdn.jsdelivr.net',
          "'unsafe-inline'", // Required for Swagger UI inline styles
        ],
        connectSrc: [
          "'self'",
          // Allow connections to API endpoints for Swagger spec
        ],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration - allow frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  // Production frontend origins (Vercel, etc.)
  process.env.FRONTEND_ORIGIN,
].filter(Boolean) as string[];

// Helper to check if origin is a Vercel deployment
const isVercelOrigin = (origin: string): boolean => {
  return /^https:\/\/.*\.vercel\.app$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // In development, allow all origins
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // If FRONTEND_ORIGIN is explicitly set, check it first (more secure)
      if (process.env.FRONTEND_ORIGIN) {
        const isAllowed = allowedOrigins.some(allowed => origin === allowed);
        if (isAllowed) {
          return callback(null, true);
        }
        // If FRONTEND_ORIGIN is set but doesn't match, check if it's a Vercel origin
        // (useful for preview deployments that match the pattern)
        if (isVercelOrigin(origin)) {
          return callback(null, true);
        }
        console.warn(`CORS blocked origin: ${origin} (FRONTEND_ORIGIN is set to: ${process.env.FRONTEND_ORIGIN})`);
        return callback(new Error('Not allowed by CORS'));
      }
      
      // If FRONTEND_ORIGIN is not set, allow all Vercel preview deployments
      // (fallback for convenience when FRONTEND_ORIGIN is not configured)
      if (isVercelOrigin(origin)) {
        return callback(null, true);
      }
      
      // Check against explicitly allowed origins (localhost, etc.)
      const isAllowed = allowedOrigins.some(allowed => origin === allowed);
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Initialize Passport (no session needed - we use JWT cookies)
app.use(passport.initialize());

app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/healthz', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger UI - Use CDN resources to avoid static file serving issues on Vercel
// Serve JSON spec at /api-docs.json
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Swagger UI HTML page with CDN resources
app.get('/api-docs', (req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MeetHalf API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      display: none;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      // Use window.location.origin to get the current base URL dynamically
      const specUrl = window.location.origin + '/api-docs.json';
      const ui = SwaggerUIBundle({
        url: specUrl,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true
      });
    };
  </script>
</body>
</html>`;
  
  res.send(html);
});

// Routes
app.use('/auth', authRouter);
app.use('/events', eventsRouter);
app.use('/members', membersRouter);
app.use('/maps', mapsRateLimiter, mapsRouter);
app.use('/users', usersRouter);

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

// Export app for Vercel serverless function
// @vercel/node automatically handles Express apps exported as default
export default app;

// Guard: do not start server in test mode or Vercel environment
if (process.env.NODE_ENV === 'test' || process.env.VERCEL) {
  // Test mode or Vercel, skip server startup
  // Vercel will use the exported handler instead
} else {
  // Start server only in non-test, non-Vercel environments
  // Use 0.0.0.0 to allow external connections (e.g., from containers)
  // Use 127.0.0.1 for local development security
  const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/healthz`);
  });
}

