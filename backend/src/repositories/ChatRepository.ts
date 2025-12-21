import prisma from '../lib/prisma';

export class ChatRepository {
  /**
   * Create a new chat message
   */
  async createMessage(data: {
    content: string;
    senderId: string;
    receiverId?: string;
    groupId?: number;
  }) {
    return prisma.chatMessage.create({
      data: {
        content: data.content,
        senderId: data.senderId,
        receiverId: data.receiverId,
        groupId: data.groupId,
        readBy: [data.senderId], // Sender has already "read" their own message
      },
    });
  }

  /**
   * Get messages between two users (private chat)
   */
  async getPrivateMessages(userId1: string, userId2: string, limit = 50, offset = 0) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
        groupId: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get sender info for each message
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const users = await prisma.user.findMany({
      where: {
        userId: { in: senderIds },
      },
      select: {
        userId: true,
        name: true,
        avatar: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.userId, u]));
    
    // Return in chronological order (oldest first)
    return messages.reverse().map((m) => ({
      ...m,
      sender: usersMap.get(m.senderId),
    }));
  }

  /**
   * Get messages in a group
   */
  async getGroupMessages(groupId: number, limit = 50, offset = 0) {
    const messages = await prisma.chatMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get sender info for each message
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const users = await prisma.user.findMany({
      where: {
        userId: { in: senderIds },
      },
      select: {
        userId: true,
        name: true,
        avatar: true,
      },
    });

    const usersMap = new Map(users.map((u) => [u.userId, u]));
    
    // Return in chronological order (oldest first)
    return messages.reverse().map((m) => ({
      ...m,
      sender: usersMap.get(m.senderId),
    }));
  }

  /**
   * Mark message as read by a user
   */
  async markAsRead(messageId: number, userId: string) {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) return null;

    const readBy = message.readBy as string[];
    if (!readBy.includes(userId)) {
      return prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          readBy: [...readBy, userId],
        },
      });
    }

    return message;
  }

  /**
   * Get conversation list for a user (recent chats)
   */
  async getConversations(userId: string) {
    // Get all messages where user is sender or receiver
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
          {
            group: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        group: {
          include: {
            members: {
              select: {
                userId: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Group messages by conversation
    const conversationMap = new Map<string, any>();

    for (const message of messages) {
      let key: string;
      let type: 'user' | 'group';
      let conversationId: string | number;
      let name: string;
      let avatar: string | null = null;

      if (message.groupId) {
        // Group conversation
        key = `group-${message.groupId}`;
        type = 'group';
        conversationId = message.groupId;
        name = message.group?.name || 'Unknown Group';
      } else {
        // Private conversation
        const otherUserId = message.senderId === userId ? message.receiverId! : message.senderId;
        key = `user-${otherUserId}`;
        type = 'user';
        conversationId = otherUserId;
        name = ''; // Will be filled later
      }

      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          type,
          id: conversationId,
          name,
          avatar,
          lastMessage: message,
          unreadCount: 0,
        });
      }
    }

    // Get user info for private conversations and calculate unread counts
    const privateConversations = Array.from(conversationMap.values()).filter(
      (c) => c.type === 'user'
    );
    
    if (privateConversations.length > 0) {
      const userIds = privateConversations.map((c) => c.id as string);
      const users = await prisma.user.findMany({
        where: {
          userId: { in: userIds },
        },
        select: {
          userId: true,
          name: true,
          avatar: true,
        },
      });

      const usersMap = new Map(users.map((u) => [u.userId, u]));
      
      for (const conv of privateConversations) {
        const user = usersMap.get(conv.id as string);
        if (user) {
          conv.name = user.name;
          conv.avatar = user.avatar;
        }
      }
    }

    // Calculate unread counts
    for (const [key, conv] of conversationMap.entries()) {
      if (conv.type === 'user') {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            OR: [
              { senderId: conv.id, receiverId: userId },
            ],
            NOT: {
              readBy: {
                has: userId,
              },
            },
          },
        });
        conv.unreadCount = unreadCount;
      } else {
        // For groups, count messages not read by user
        const unreadCount = await prisma.chatMessage.count({
          where: {
            groupId: conv.id as number,
            AND: [
              { NOT: { senderId: userId } }, // Don't count own messages
              { NOT: { readBy: { has: userId } } }, // Don't count read messages
            ],
          },
        });
        conv.unreadCount = unreadCount;
      }
    }

    return Array.from(conversationMap.values()).sort(
      (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
    );
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Count unread private messages
    const privateUnread = await prisma.chatMessage.count({
      where: {
        receiverId: userId,
        NOT: {
          readBy: {
            array_contains: userId,
          },
        },
      },
    });

    // Count unread group messages
    const groupUnread = await prisma.chatMessage.count({
      where: {
        group: {
          members: {
            some: {
              userId,
            },
          },
        },
        AND: [
          { NOT: { senderId: userId } }, // Don't count own messages
          { NOT: { readBy: { has: userId } } }, // Don't count read messages
        ],
      },
    });

    return privateUnread + groupUnread;
  }

  /**
   * Search messages by content
   */
  async searchMessages(userId: string, keyword: string, limit = 20) {
    return prisma.chatMessage.findMany({
      where: {
        content: {
          contains: keyword,
          mode: 'insensitive',
        },
        OR: [
          { senderId: userId },
          { receiverId: userId },
          {
            group: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}

export const chatRepository = new ChatRepository();

