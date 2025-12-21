import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getUserUserId } from '../lib/userUtils';
import { statsService } from '../services/StatsService';
import { updateProfileSchema, type UpdateProfileRequest } from '../schemas/users';
import prisma from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /users/me/stats:
 *   get:
 *     summary: Get user statistics (requires authentication)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalEvents:
 *                       type: integer
 *                       description: Total number of events participated
 *                     ontimeCount:
 *                       type: integer
 *                       description: Number of events arrived on time
 *                     lateCount:
 *                       type: integer
 *                       description: Number of events arrived late
 *                     absentCount:
 *                       type: integer
 *                       description: Number of events absent
 *                     avgLateMinutes:
 *                       type: number
 *                       description: Average late minutes
 *                     totalPokeReceived:
 *                       type: integer
 *                       description: Total pokes received
 *                     totalPokeSent:
 *                       type: integer
 *                       description: Total pokes sent
 *                     ontimeRate:
 *                       type: number
 *                       description: On-time arrival rate (0-1)
 *                     bestRank:
 *                       type: integer
 *                       nullable: true
 *                       description: Best rank achieved
 *                     worstRank:
 *                       type: integer
 *                       nullable: true
 *                       description: Worst rank achieved
 *       401:
 *         description: Unauthorized
 */
// GET /users/me/stats - Get user statistics
router.get('/me/stats', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
      return;
    }

    const stats = await statsService.getUserStats(userUserId);

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch user statistics',
    });
  }
});

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get user profile (requires authentication)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *                     defaultLat:
 *                       type: number
 *                       nullable: true
 *                     defaultLng:
 *                       type: number
 *                       nullable: true
 *                     defaultAddress:
 *                       type: string
 *                       nullable: true
 *                     defaultLocationName:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 */
// GET /users/profile - Get user profile
router.get('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const user = await prisma.user.findUnique({
      where: { id: jwtPayload.userId },
      select: {
        userId: true,
        email: true,
        name: true,
        avatar: true,
        defaultLat: true,
        defaultLng: true,
        defaultAddress: true,
        defaultLocationName: true,
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
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch user profile',
    });
  }
});

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update user profile (requires authentication)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 nullable: true
 *               defaultLat:
 *                 type: number
 *                 nullable: true
 *               defaultLng:
 *                 type: number
 *                 nullable: true
 *               defaultAddress:
 *                 type: string
 *                 nullable: true
 *               defaultLocationName:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
// PATCH /users/profile - Update user profile
router.patch('/profile', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: validation.error.errors,
      });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const data = validation.data as UpdateProfileRequest;

    // Build update object with only provided fields
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.defaultLat !== undefined) updateData.defaultLat = data.defaultLat;
    if (data.defaultLng !== undefined) updateData.defaultLng = data.defaultLng;
    if (data.defaultAddress !== undefined) updateData.defaultAddress = data.defaultAddress;
    if (data.defaultLocationName !== undefined) updateData.defaultLocationName = data.defaultLocationName;

    const user = await prisma.user.update({
      where: { id: jwtPayload.userId },
      data: updateData,
      select: {
        userId: true,
        email: true,
        name: true,
        avatar: true,
        defaultLat: true,
        defaultLng: true,
        defaultAddress: true,
        defaultLocationName: true,
        provider: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update user profile',
    });
  }
});

export default router;

