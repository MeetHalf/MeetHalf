import { Router, Request, Response } from 'express';
import passport from '../lib/passport';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Helper function to set JWT cookie and redirect
function setAuthCookieAndRedirect(req: Request, res: Response, user: any) {
  const token = signToken(user.id);
  const isDeployed = !!process.env.VERCEL_URL || req.protocol === 'https';
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: isDeployed ? ('none' as const) : ('lax' as const),
    secure: isDeployed,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  res.cookie('token', token, cookieOptions);

  // Redirect to frontend
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  res.redirect(`${frontendOrigin}/events`);
}

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Start Google OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to frontend with JWT cookie set
 */
router.get(
  '/google/callback',
  (req: Request, res: Response, next: any) => {
    passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        console.error('Google OAuth error:', err);
        const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
        return res.redirect(`${frontendOrigin}/events?error=auth_failed`);
      }
      if (!user) {
        console.error('Google OAuth: No user returned', info);
        const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
        return res.redirect(`${frontendOrigin}/events?error=auth_failed`);
      }
      // Attach user to request
      (req as any).user = user;
      next();
    })(req, res, next);
  },
  (req: Request, res: Response) => {
    // @ts-ignore - passport adds user to request
    const user = (req as any).user;
    if (!user) {
      const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
      return res.redirect(`${frontendOrigin}/events?error=auth_failed`);
    }
    setAuthCookieAndRedirect(req, res, user);
  }
);

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Start GitHub OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth
 */
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to frontend with JWT cookie set
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/', session: false }),
  (req: Request, res: Response) => {
    // @ts-ignore - passport adds user to request
    const user = (req as any).user;
    if (!user) {
      const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
      return res.redirect(`${frontendOrigin}/events?error=auth_failed`);
    }
    setAuthCookieAndRedirect(req, res, user);
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user information (optional authentication)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User information or null if not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   nullable: true
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /auth/me - Optional authentication (returns user or null)
router.get('/me', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      // Not authenticated - return null user (anonymous mode)
      res.json({ user: null });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userId = jwtPayload.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An error occurred while fetching user',
    });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
// POST /auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  const isDeployed = !!process.env.VERCEL_URL || req.protocol === 'https';
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: isDeployed ? ('none' as const) : ('lax' as const),
    secure: isDeployed,
    path: '/',
  };

  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  res.clearCookie('token', cookieOptions);
  res.json({ message: 'Logout successful' });
});

export default router;
