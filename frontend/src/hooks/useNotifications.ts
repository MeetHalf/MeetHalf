import { useState, useCallback, useEffect } from 'react';
import { notificationsApi } from '../api/notifications';
import { Notification } from '../types/notification';
import { usePusher } from './usePusher';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load notifications
  const loadNotifications = useCallback(async (options?: { read?: boolean; limit?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const { notifications: data } = await notificationsApi.getNotifications(options);
      setNotifications(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const { count } = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Error loading unread count:', err);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      // Also update unread count if it was unread
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  // Set up Pusher for real-time notifications
  usePusher({
    channelName: userId ? `notification-${userId}` : null,
    eventName: 'new-notification',
    onEvent: (data: Notification) => {
      console.log('[useNotifications] New notification received:', data);
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    },
  });

  // Listen for friend request events
  usePusher({
    channelName: userId ? `notification-${userId}` : null,
    eventName: 'friend-request',
    onEvent: (data: any) => {
      console.log('[useNotifications] Friend request received:', data);
      if (data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    },
  });

  // Listen for friend accepted events
  usePusher({
    channelName: userId ? `notification-${userId}` : null,
    eventName: 'friend-accepted',
    onEvent: (data: any) => {
      console.log('[useNotifications] Friend accepted:', data);
      if (data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    },
  });

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadNotifications({ read: false, limit: 50 });
      loadUnreadCount();
    }
  }, [userId, loadNotifications, loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

