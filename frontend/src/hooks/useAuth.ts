import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import api from '../api/axios';

interface User {
  id: number;
  userId?: string; // User.userId (string identifier)
  email: string;
  name: string;
  avatar?: string | null;
  provider?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      console.log('[Auth] Calling /auth/me to refresh user state');
      const response = await api.get('/auth/me');
      console.log('[Auth] /auth/me response:', {
        hasUser: !!response.data.user,
        userId: response.data.user?.id,
        email: response.data.user?.email,
      });
      setUser(response.data.user);
    } catch (error: any) {
      console.warn('[Auth] /auth/me failed:', {
        message: error?.message,
        response: error?.response?.data,
      });
      // Silently fail - user is not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);


  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
    
    // Also clear auth token from sessionStorage (mobile fallback)
    try {
      sessionStorage.removeItem('auth_token');
      console.log('[Auth] Cleared auth token from sessionStorage');
    } catch (error) {
      console.error('[Auth] Error clearing auth token from sessionStorage:', error);
    }
  }, []);

  useEffect(() => {
    refreshMe();
    
    // Listen for auth token updates (from temp token exchange)
    const handleAuthTokenUpdate = () => {
      console.log('[Auth] Auth token updated event received, refreshing user');
      refreshMe();
    };
    
    window.addEventListener('auth-token-updated', handleAuthTokenUpdate);
    
    return () => {
      window.removeEventListener('auth-token-updated', handleAuthTokenUpdate);
    };
  }, [refreshMe]);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, logout, refreshMe } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}