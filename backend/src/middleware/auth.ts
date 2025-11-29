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
      // Log for debugging in production (helps identify cookie issues)
      if (process.env.NODE_ENV === 'production') {
        console.warn('[Auth] No token in cookies', {
          cookies: Object.keys(req.cookies),
          headers: {
            cookie: req.headers.cookie ? 'present' : 'missing',
            origin: req.headers.origin,
          },
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


