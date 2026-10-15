import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';

// Mock axios
vi.mock('../../api/axios');

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Not authenticated'));
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('should load user data on mount', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { user: mockUser },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should refresh user after OAuth login', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
    };

    // Mock initial refreshMe call
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Not authenticated'));
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock login call
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { user: mockUser },
    });

    await act(async () => { await result.current.refreshMe(); });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should handle logout', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
    };

    // Mock initial user load
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { user: mockUser },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Mock logout
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

    await act(async () => { await result.current.logout(); });

    expect(result.current.user).toBe(null);
  });
});


