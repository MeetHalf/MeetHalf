import { useState, useCallback, useEffect } from 'react';
import { chatApi } from '../api/chat';
import { ChatMessage, Conversation } from '../types/chat';
import { usePusher } from './usePusher';

export function useChat(userId?: string, type?: 'user' | 'group', id?: string | number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { conversations: data } = await chatApi.getConversations();
      setConversations(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (params: { receiverId?: string; groupId?: number; limit?: number; offset?: number }) => {
      try {
        setLoading(true);
        setError(null);
        const { messages: data } = await chatApi.getMessages(params);
        setMessages(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load messages');
        console.error('Error loading messages:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const { count } = await chatApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Error loading unread count:', err);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string, receiverId?: string, groupId?: number) => {
    try {
      setError(null);
      const { message } = await chatApi.sendMessage({ content, receiverId, groupId });
      // Add to local messages
      setMessages((prev) => [...prev, message]);
      return message;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send message');
      console.error('Error sending message:', err);
      return null;
    }
  }, []);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: number) => {
    try {
      await chatApi.markAsRead(messageId);
    } catch (err: any) {
      console.error('Error marking message as read:', err);
    }
  }, []);

  // Mark entire conversation as read
  const markConversationAsRead = useCallback(async (params: { receiverId?: string; groupId?: number }) => {
    try {
      const result = await chatApi.markConversationAsRead(params);
      // Update local unread count
      await loadUnreadCount();
      return result.count;
    } catch (err: any) {
      console.error('Error marking conversation as read:', err);
      return 0;
    }
  }, [loadUnreadCount]);

  // Search messages
  const searchMessages = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const { messages: data } = await chatApi.searchMessages(query);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to search messages');
      console.error('Error searching messages:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up Pusher for real-time messages
  const channelName = type && id
    ? type === 'user'
      ? `chat-user-${id}`
      : `group-${id}`
    : null;

  usePusher({
    channelName,
    eventName: 'new-message',
    onEvent: (data: ChatMessage) => {
      console.log('[useChat] New message received:', data);
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === data.id)) {
          return prev;
        }
        return [...prev, data];
      });
      
      // If user is currently in this chat and the message is from someone else, mark as read
      if (userId && type && id && data.senderId !== userId) {
        // Mark the message as read immediately
        markAsRead(data.id);
      }
      
      // Update unread count
      loadUnreadCount();
    },
  });

  // Listen for read receipts
  usePusher({
    channelName,
    eventName: 'message-read',
    onEvent: (data: { messageId: number; readBy: string }) => {
      console.log('[useChat] Message read receipt:', data);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                readBy: [...new Set([...m.readBy, data.readBy])],
              }
            : m
        )
      );
    },
  });

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadUnreadCount();
    }
  }, [userId, loadUnreadCount]);

  return {
    messages,
    conversations,
    unreadCount,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    loadUnreadCount,
    searchMessages,
  };
}

