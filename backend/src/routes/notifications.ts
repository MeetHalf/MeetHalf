import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getUserUserId } from '../lib/userUtils';
import { notificationService } from '../services/NotificationService';
import { getNotificationsSchema, notificationIdSchema } from '../schemas/notifications';

const router = Router();

/**
 * GET /api/notifications - Get notifications
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }

    // Validate query
    const result = getNotificationsSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { read, limit } = result.data;
    const notifications = await notificationService.getNotifications(userUserId, { read, limit });
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' });
  }
});

/**
 * PUT /api/notifications/:id/read - Mark notification as read
 */
router.put('/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }

    // Validate params
    const result = notificationIdSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { id } = result.data;
    await notificationService.markAsRead(id, userUserId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    if (error.message === 'Notification not found') {
      res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    } else if (error.message === 'Unauthorized') {
      res.status(403).json({ code: 'FORBIDDEN', message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' });
    }
  }
});

/**
 * PUT /api/notifications/read-all - Mark all notifications as read
 */
router.put('/read-all', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }

    await notificationService.markAllAsRead(userUserId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id - Delete notification
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }

    // Validate params
    const result = notificationIdSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { id } = result.data;
    await notificationService.deleteNotification(id, userUserId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    if (error.message === 'Notification not found') {
      res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    } else if (error.message === 'Unauthorized') {
      res.status(403).json({ code: 'FORBIDDEN', message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to delete notification' });
    }
  }
});

/**
 * GET /api/notifications/unread-count - Get unread notification count
 */
router.get('/unread-count', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }

    const count = await notificationService.getUnreadCount(userUserId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch unread count' });
  }
});

export default router;

