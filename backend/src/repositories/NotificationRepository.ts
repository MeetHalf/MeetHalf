import prisma from '../lib/prisma';
import { NotificationType } from '@prisma/client';

export class NotificationRepository {
  /**
   * Create a notification
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || null,
        read: false,
      },
    });
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, options?: { read?: boolean; limit?: number }) {
    const { read, limit = 50 } = options || {};
    
    return prisma.notification.findMany({
      where: {
        userId,
        ...(read !== undefined && { read }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: number) {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: number) {
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: number) {
    return prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Delete old read notifications (cleanup)
   */
  async deleteOldReadNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
  }
}

export const notificationRepository = new NotificationRepository();

