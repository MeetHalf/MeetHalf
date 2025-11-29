import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getUserUserId } from '../lib/userUtils';
import { statsService } from '../services/StatsService';

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

export default router;

