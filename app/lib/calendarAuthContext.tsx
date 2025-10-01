'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CalendarAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userInfo: { name?: string; email?: string } | null;
  authenticate: () => void;
  disconnect: () => void;
}

const CalendarAuthContext = createContext<CalendarAuthContextType | undefined>(undefined);

export function CalendarAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    // Check if calendar token exists and get user info
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/google/calendar/check');
        const data = await response.json();
        setIsAuthenticated(data.tokenOk);
        
        if (data.tokenOk) {
          // Fetch user info from our server-side endpoint to avoid CORS issues
          try {
            const userResponse = await fetch('/api/auth/google/calendar/userinfo');
            if (userResponse.ok) {
              const userData = await userResponse.json();
              setUserInfo({ name: userData.name, email: userData.email });
            }
          } catch (error) {
            console.error('Failed to fetch user info:', error);
          }
        } else {
          setUserInfo(null);
        }
      } catch {
        setIsAuthenticated(false);
        setUserInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const authenticate = () => {
    window.location.href = `/api/auth/google/calendar?origin=${encodeURIComponent(location.pathname)}`;
  };

  const disconnect = async () => {
    try {
      await fetch('/api/auth/google/calendar/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUserInfo(null);
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
    }
  };

  return (
    <CalendarAuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      userInfo,
      authenticate,
      disconnect
    }}>
      {children}
    </CalendarAuthContext.Provider>
  );
}

export const useCalendarAuth = () => {
  const context = useContext(CalendarAuthContext);
  if (context === undefined) {
    throw new Error('useCalendarAuth must be used within a CalendarAuthProvider');
  }
  return context;
};
