import { useState, useCallback } from 'react';
import { friendsApi } from '../api/friends';
import { Friend, FriendRequest, User } from '../types/friend';

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load friends list
  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[useFriends] Loading friends...');
      const { friends: data } = await friendsApi.getFriends();
      console.log('[useFriends] Friends loaded:', data);
      setFriends(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load friends';
      console.error('[useFriends] Error loading friends:', {
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

  // Load friend requests
  const loadRequests = useCallback(async (type: 'received' | 'sent' = 'received') => {
    try {
      setLoading(true);
      setError(null);
      const { requests: data } = await friendsApi.getRequests(type);
      setRequests(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load requests');
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send friend request
  const sendRequest = useCallback(async (toUserId: string) => {
    try {
      setLoading(true);
      setError(null);
      await friendsApi.sendRequest(toUserId);
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send request');
      console.error('Error sending request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Accept friend request
  const acceptRequest = useCallback(async (requestId: number) => {
    try {
      setLoading(true);
      setError(null);
      await friendsApi.acceptRequest(requestId);
      // Remove from requests list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      // Reload friends to include new friend
      await loadFriends();
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to accept request');
      console.error('Error accepting request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadFriends]);

  // Reject friend request
  const rejectRequest = useCallback(async (requestId: number) => {
    try {
      setLoading(true);
      setError(null);
      await friendsApi.rejectRequest(requestId);
      // Remove from requests list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reject request');
      console.error('Error rejecting request:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete friend
  const deleteFriend = useCallback(async (friendId: string) => {
    try {
      setLoading(true);
      setError(null);
      await friendsApi.deleteFriend(friendId);
      // Remove from friends list
      setFriends((prev) => prev.filter((f) => f.userId !== friendId));
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete friend');
      console.error('Error deleting friend:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { users } = await friendsApi.searchUsers(query);
      setSearchResults(users);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to search users');
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    friends,
    requests,
    searchResults,
    loading,
    error,
    loadFriends,
    loadRequests,
    sendRequest,
    acceptRequest,
    rejectRequest,
    deleteFriend,
    searchUsers,
  };
}

