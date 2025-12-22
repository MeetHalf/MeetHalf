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
      console.log('[useChat] Loading conversations...');
      const { conversations: data } = await chatApi.getConversations();
      console.log('[useChat] Conversations loaded:', data);
      setConversations(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load conversations';
      console.error('[useChat] Error loading conversations:', {
        message: errorMessage,
        status: err?.response?.status,
        data: err?.response?.data,
        fullError: err,
      });
      setError(errorMessage);
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
      // Add to local messages for optimistic update
      // Pusher event will update it if it arrives (handled by duplicate check)
      setMessages((prev) => {
        // Check if message already exists (from Pusher event that arrived first)
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
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
      
      // Trigger event to notify other components to update their unread count
      window.dispatchEvent(new CustomEvent('chat-unread-updated'));
      
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
        // Check if message already exists by ID
        const existingIndex = prev.findIndex((m) => m.id === data.id);
        if (existingIndex !== -1) {
          console.log('[useChat] Duplicate message detected by ID, updating:', data.id);
          // Update existing message with server data (in case it has more complete info)
          const updated = [...prev];
          updated[existingIndex] = data;
          return updated;
        }
        // Also check for duplicate by content, sender, and timestamp (within 2 seconds)
        // This handles cases where ID might not match but it's the same message
        const duplicateIndex = prev.findIndex((m) => {
          const timeDiff = Math.abs(new Date(m.createdAt).getTime() - new Date(data.createdAt).getTime());
          return (
            m.content === data.content &&
            m.senderId === data.senderId &&
            timeDiff < 2000 // 2 seconds
          );
        });
        if (duplicateIndex !== -1) {
          console.log('[useChat] Duplicate message detected by content/timestamp, updating');
          // Update existing message with server data
          const updated = [...prev];
          updated[duplicateIndex] = data;
          return updated;
        }
        return [...prev, data];
      });
      
      // If user is currently in this chat and the message is from someone else, mark as read
      if (userId && type && id && data.senderId !== userId) {
        // Mark the message as read immediately
        markAsRead(data.id);
      }
      
      // Update unread count and notify other components
      loadUnreadCount();
      window.dispatchEvent(new CustomEvent('chat-unread-updated'));
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

  // Listen for unread count updates from other components
  useEffect(() => {
    const handleUnreadUpdate = () => {
      if (userId) {
        loadUnreadCount();
      }
    };

    window.addEventListener('chat-unread-updated', handleUnreadUpdate);
    
    return () => {
      window.removeEventListener('chat-unread-updated', handleUnreadUpdate);
    };
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

