import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getUserUserId } from '../lib/userUtils';
import { friendService } from '../services/FriendService';
import {
  sendFriendRequestSchema,
  friendRequestIdSchema,
  friendIdSchema,
  searchUsersSchema,
  getFriendRequestsSchema,
} from '../schemas/friends';

const router = Router();

/**
 * POST /api/friends/requests - Send friend request
 */
router.post('/requests', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    // Validate request body
    const result = sendFriendRequestSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { toUserId } = result.data;

    // Prevent sending request to self
    if (toUserId === userUserId) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: 'Cannot send friend request to yourself' });
      return;
    }

    const request = await friendService.sendFriendRequest(userUserId, toUserId);
    res.json({ request });
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    if (error.message === 'Already friends' || error.message === 'Friend request already exists') {
      res.status(400).json({ code: 'INVALID_REQUEST', message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to send friend request' });
    }
  }
});

/**
 * GET /api/friends/requests - Get friend requests
 */
router.get('/requests', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = getFriendRequestsSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { type } = result.data;
    const requests = await friendService.getFriendRequests(userUserId, type);
    res.json({ requests });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch friend requests' });
  }
});

/**
 * POST /api/friends/requests/:id/accept - Accept friend request
 */
router.post('/requests/:id/accept', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = friendRequestIdSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { id } = result.data;
    await friendService.acceptFriendRequest(id, userUserId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error accepting friend request:', error);
    if (error.message === 'Friend request not found') {
      res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    } else if (error.message === 'Unauthorized' || error.message === 'Friend request is not pending') {
      res.status(400).json({ code: 'INVALID_REQUEST', message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to accept friend request' });
    }
  }
});

/**
 * POST /api/friends/requests/:id/reject - Reject friend request
 */
router.post('/requests/:id/reject', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = friendRequestIdSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { id } = result.data;
    await friendService.rejectFriendRequest(id, userUserId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error rejecting friend request:', error);
    if (error.message === 'Friend request not found') {
      res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    } else if (error.message === 'Unauthorized' || error.message === 'Friend request is not pending') {
      res.status(400).json({ code: 'INVALID_REQUEST', message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to reject friend request' });
    }
  }
});

/**
 * GET /api/friends - Get friend list
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

    const friends = await friendService.getFriends(userUserId);
    res.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch friends' });
  }
});

/**
 * DELETE /api/friends/:friendId - Delete friend
 */
router.delete('/:friendId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = friendIdSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { friendId } = result.data;
    await friendService.deleteFriend(userUserId, friendId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting friend:', error);
    if (error.message === 'Not friends') {
      res.status(400).json({ code: 'INVALID_REQUEST', message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to delete friend' });
    }
  }
});

/**
 * GET /api/friends/search - Search users
 */
router.get('/search', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = searchUsersSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { q } = result.data;
    const users = await friendService.searchUsers(q, userUserId);
    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to search users' });
  }
});

export default router;

