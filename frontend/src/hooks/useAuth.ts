import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import api from '../api/axios';

interface User {
  id: number;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      // Silently fail - user is not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      // Backend returns: { message: 'Login successful', user: {...} }
      setUser(response.data.user);
      // Set loading to false since we have user data now
      setLoading(false);
    } catch (error: any) {
      // Re-throw error so Login page can handle it
      setLoading(false);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      // Backend returns: { message: 'User registered successfully', user: {...} }
      const response = await api.post('/auth/register', { email, password });
      // After registration, automatically login
      // Backend login returns: { message: 'Login successful', user: {...} }
      const loginResponse = await api.post('/auth/login', { email, password });
      setUser(loginResponse.data.user);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, login, register, logout, refreshMe } },
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