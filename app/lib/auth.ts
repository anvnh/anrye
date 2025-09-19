'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  username: string;
  loginTime: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = (): AuthContextType => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        setUser(data.username ? { username: data.username, loginTime: data.loginTime } : null);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        // Also clear Google Drive auth when app auth is not valid
        try {
          const mod = await import('../(home)/notes/services/googleDrive');
          await mod.driveService.signOut();
        } catch {}
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      // Network/auth error: ensure Drive is signed out to avoid stale tokens
      try {
        const mod = await import('../(home)/notes/services/googleDrive');
        await mod.driveService.signOut();
      } catch {}
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Proactively sign out of Google Drive when app logs out
      try {
        const mod = await import('../(home)/notes/services/googleDrive');
        await mod.driveService.signOut();
      } catch {}
      setIsAuthenticated(false);
      setUser(null);
      router.push('/login');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    isAuthenticated,
    user,
    logout,
    checkAuth,
  };
};
