import React, { createContext, useContext, useEffect, useState } from 'react';
import * as secureStorage from '../services/secureStorage';
import api from '../services/api';

export type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  addictions: string[];
  stage: string;
  dailyGoal: number;
  isPremium: boolean;
  premiumPlan: string | null;
  premiumExpiresAt: string | null;
  trialStartedAt: string | null;
  ageVerified: boolean;
  locale: string;
  aiMessagesUsedToday: number;
  trialDaysLeft: number | null;
  isOnTrial: boolean;
  notificationPrivacy: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, locale?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Helper: the backend always wraps in { user: {...} } — unwrap it.
function extractUser(data: any): User {
  return data?.user ?? data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await secureStorage.getItemAsync('accessToken');
      if (token) {
        const { data } = await api.get('/users/me');
        setUser(extractUser(data));
      }
    } catch {
      await secureStorage.deleteItemAsync('accessToken');
      await secureStorage.deleteItemAsync('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    await secureStorage.setItemAsync('accessToken', data.accessToken);
    await secureStorage.setItemAsync('refreshToken', data.refreshToken);
    const me = await api.get('/users/me');
    setUser(extractUser(me.data));
  }

  async function register(email: string, password: string, name: string, locale?: string) {
    const { data } = await api.post('/auth/register', { email, password, name });
    await secureStorage.setItemAsync('accessToken', data.accessToken);
    await secureStorage.setItemAsync('refreshToken', data.refreshToken);
    // Sync locale chosen before registration
    if (locale && locale !== 'en-US') {
      await api.patch('/users/me', { locale }).catch(() => {});
    }
    const me = await api.get('/users/me');
    setUser(extractUser(me.data));
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    await secureStorage.deleteItemAsync('accessToken');
    await secureStorage.deleteItemAsync('refreshToken');
    setUser(null);
  }

  async function refreshUser() {
    const { data } = await api.get('/users/me');
    setUser(extractUser(data));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
