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
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
}


