import { Request, Response, NextFunction } from 'express';
import { verifyToken, verifyGuestToken, JWTPayload, GuestTokenPayload } from '../utils/jwt';

// Type guard to check if req.user is JWTPayload
export function isJWTPayload(user: any): user is JWTPayload {
  return user && typeof user === 'object' && 'userId' in user && typeof user.userId === 'number';
}

// Extract token from Authorization header or cookies
function extractToken(req: Request): string | null {
  // Check Authorization header first (for guest tokens)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback to cookie
  return req.cookies.token || null;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      // Log detailed cookie information when token is missing (for debugging)
      if (process.env.VERCEL_URL || req.protocol === 'https') {
        console.warn('[Auth] No token in cookies or Authorization header:', {
          hasCookies: Object.keys(req.cookies).length > 0,
          cookieKeys: Object.keys(req.cookies),
          cookieHeader: req.headers.cookie ? 'present' : 'missing',
          authorizationHeader: req.headers.authorization ? 'present' : 'missing',
          origin: req.headers.origin,
          host: req.headers.host,
          protocol: req.protocol,
          secure: req.secure,
        });
      }
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    // Try to verify as regular JWT token first
    try {
      const payload = verifyToken(token);
      (req as any).user = payload;
      next();
      return;
    } catch (error) {
      // If regular token fails, try guest token
      try {
        const guestPayload = verifyGuestToken(token);
        (req as any).user = guestPayload;
        next();
        return;
      } catch (guestError) {
        // Both failed
        throw new Error('Invalid or expired token');
      }
    }
  } catch (error) {
    // Log token verification errors for debugging
    if (process.env.NODE_ENV === 'production') {
      console.error('[Auth] Token verification failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hasToken: !!extractToken(req),
      });
    }
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}

// Optional authentication middleware - sets req.user if authenticated, but doesn't require it
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        // Try regular JWT token first
        const payload = verifyToken(token);
        (req as any).user = payload;
      } catch (error) {
        // If regular token fails, try guest token
        try {
          const guestPayload = verifyGuestToken(token);
          (req as any).user = guestPayload;
        } catch (guestError) {
          // Both failed - continue as anonymous user
          (req as any).user = undefined;
        }
      }
    }
    // No token or invalid token - continue as anonymous user
    next();
  } catch (error) {
    // On any error, continue as anonymous user
    (req as any).user = undefined;
    next();
  }
}


