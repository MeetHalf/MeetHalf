import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getUserUserId } from '../lib/userUtils';
import { chatService } from '../services/ChatService';
import { logger } from '../lib/logger';
import {
  sendMessageSchema,
  getMessagesSchema,
  markMessageReadSchema,
  searchMessagesSchema,
} from '../schemas/chat';

const router = Router();

/**
 * POST /api/chat/messages - Send a message
 */
router.post('/messages', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = sendMessageSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { content, receiverId, groupId } = result.data;

    const message = await chatService.sendMessage({
      content,
      senderId: userUserId,
      receiverId,
      groupId,
    });

    res.json({ message });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: error.message || 'Failed to send message' });
  }
});

/**
 * GET /api/chat/messages - Get messages
 */
router.get('/messages', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = getMessagesSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { receiverId, groupId, limit, offset } = result.data;

    const messages = await chatService.getMessages({
      userId: userUserId,
      receiverId,
      groupId,
      limit,
      offset,
    });

    res.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    if (error.message === 'Not a member of this group') {
      res.status(403).json({ code: 'FORBIDDEN', message: error.message });
    } else {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch messages' });
    }
  }
});

/**
 * PUT /api/chat/messages/:id/read - Mark message as read
 */
router.put('/messages/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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
    const result = markMessageReadSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { id } = result.data;
    await chatService.markAsRead(id, userUserId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to mark message as read' });
  }
});

/**
 * GET /api/chat/conversations - Get conversation list
 */
router.get('/conversations', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  let userUserId: string | null = null;
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }

    const conversations = await chatService.getConversations(userUserId);
    logger.debug('[Chat] Conversations fetched:', { count: conversations.length, userId: userUserId });
    res.json({ conversations });
  } catch (error) {
    console.error('[Chat] Error fetching conversations:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: userUserId,
    });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch conversations' });
  }
});

/**
 * PUT /api/chat/conversations/read - Mark conversation as read
 */
router.put('/conversations/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    const { receiverId, groupId } = req.body;

    if (!receiverId && !groupId) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Either receiverId or groupId is required' });
      return;
    }

    const count = await chatService.markConversationAsRead(
      userUserId,
      receiverId,
      groupId ? parseInt(groupId) : undefined
    );

    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to mark conversation as read' });
  }
});

/**
 * GET /api/chat/unread-count - Get unread message count
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

    const count = await chatService.getUnreadCount(userUserId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch unread count' });
  }
});

/**
 * GET /api/chat/search - Search messages
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
    const result = searchMessagesSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: result.error.errors[0].message });
      return;
    }

    const { q } = result.data;
    const messages = await chatService.searchMessages(userUserId, q);
    res.json({ messages });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to search messages' });
  }
});

export default router;

