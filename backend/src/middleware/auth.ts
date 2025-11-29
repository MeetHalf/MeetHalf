import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';

// 擴展 Express Request 型別
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies.token;

    if (!token) {
      // Log detailed cookie information when token is missing (for debugging)
      if (process.env.VERCEL_URL || req.protocol === 'https') {
        console.warn('[Auth] No token in cookies:', {
          hasCookies: Object.keys(req.cookies).length > 0,
          cookieKeys: Object.keys(req.cookies),
          cookieHeader: req.headers.cookie ? 'present' : 'missing',
          cookieHeaderValue: req.headers.cookie?.substring(0, 100) || 'missing', // Log first 100 chars
          origin: req.headers.origin,
          host: req.headers.host,
          protocol: req.protocol,
          secure: req.secure,
          userAgent: req.headers['user-agent']?.substring(0, 50), // Browser type hint
        });
      }
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    // Log token verification errors for debugging
    if (process.env.NODE_ENV === 'production') {
      console.error('[Auth] Token verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hasToken: !!req.cookies.token,
      });
    }
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}


