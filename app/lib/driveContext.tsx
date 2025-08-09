'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DriveContextType {
  isSignedIn: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSignInStatus: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getTokenStatus: () => any;
  forceReAuthenticate: () => Promise<void>;
  resetGoogleAPI: () => Promise<void>;
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export function DriveProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  // Lazy-load the Google Drive module only when needed
  let driveModulePromise: Promise<typeof import('./googleDrive')> | null = null;
  const loadDriveModule = () => {
    if (!driveModulePromise) {
      driveModulePromise = import('./googleDrive');
    }
    return driveModulePromise;
  };

  useEffect(() => {
    // On mount, do a lightweight check using localStorage only.
    const initializeAuth = async () => {
      if (typeof window !== 'undefined') {
        try {
          // If we just returned from OAuth in the same window, process tokens now
          const temp = window.localStorage.getItem('google_drive_tokens_temp');
          if (temp) {
            try {
              const mod = await loadDriveModule();
              const ok = await mod.driveService.signIn();
              setIsSignedIn(!!ok);
              setIsLoading(false);
              return;
            } catch {}
          }

          const tokenRaw = window.localStorage.getItem('google_drive_token');
          if (!tokenRaw) {
            setIsSignedIn(false);
            setIsLoading(false);
            return;
          }

          // Optimistically mark as signed-in to avoid blocking main thread
          setIsSignedIn(true);
          setIsLoading(false);

          // Validate token in background during idle time
          const idle = (cb: () => void) =>
            (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 1);

          idle(async () => {
            try {
              const mod = await loadDriveModule();
              // Reload saved token and verify
              mod.driveService.reloadSavedToken();
              const ok = await mod.driveService.isSignedIn();
              setIsSignedIn(!!ok);
            } catch {
              setIsSignedIn(false);
            }
          });
        } catch {
          setIsSignedIn(false);
          setIsLoading(false);
        }
      } else {
        setIsSignedIn(false);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const checkSignInStatus = async () => {
    setIsLoading(true);
    try {
      // Avoid loading Drive if no token exists
      const tokenRaw = typeof window !== 'undefined' ? window.localStorage.getItem('google_drive_token') : null;
      if (!tokenRaw) {
        setIsSignedIn(false);
        return;
      }
      const mod = await loadDriveModule();
      const signedIn = await mod.driveService.isSignedIn();
      setIsSignedIn(!!signedIn);
    } catch {
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    setIsLoading(true);
    try {
      const mod = await loadDriveModule();
      const success = await mod.driveService.signIn();
      setIsSignedIn(!!success);
      
      // Clear any old cache and reset authentication state in image manager
      if (success) {
        const { imageLoadingManager } = await import('../(home)/notes/_utils/imageLoadingManager');
        imageLoadingManager.clearCache();
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const mod = await loadDriveModule();
      await mod.driveService.signOut();
      
      // Clear image cache when signing out
      const { imageLoadingManager } = await import('../(home)/notes/_utils/imageLoadingManager');
      imageLoadingManager.clearCache();
    } catch {}
    setIsSignedIn(false);
  };

  const refreshToken = async () => {
    setIsLoading(true);
    try {
      const mod = await loadDriveModule();
      const success = await mod.driveService.refreshAccessToken();
      setIsSignedIn(!!success);
    } catch (error) {
      console.error('Token refresh failed:', error);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const forceReAuthenticate = async () => {
    setIsLoading(true);
    try {
      const mod = await loadDriveModule();
      const success = await mod.driveService.forceReAuthenticate();
      setIsSignedIn(!!success);
    } catch (error) {
      console.error('Force re-authentication failed:', error);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const resetGoogleAPI = async () => {
    setIsLoading(true);
    try {
      const mod = await loadDriveModule();
      await mod.driveService.resetGoogleAPI();
    } catch (error) {
      console.error('Reset Google API failed:', error);
    } finally {
      setIsSignedIn(false);
      setIsLoading(false);
    }
  };

  const getTokenStatus = () => {
    // Lightweight status without importing the heavy module
    try {
      const tokenRaw = typeof window !== 'undefined' ? window.localStorage.getItem('google_drive_token') : null;
      if (!tokenRaw) {
        return { hasAccessToken: false, hasRefreshToken: false };
      }
      const token = JSON.parse(tokenRaw);
      const now = Date.now();
      const accessLeft = token.expires_at ? token.expires_at - now : 0;
      const refreshLeft = token.refresh_expires_at ? token.refresh_expires_at - now : 0;
      return {
        hasAccessToken: true,
        hasRefreshToken: !!token.refresh_token,
        timeUntilAccessExpiry: accessLeft > 0 ? `${Math.floor(accessLeft / 60000)} phút` : 'Đã hết hạn',
        timeUntilRefreshExpiry: refreshLeft > 0 ? `${Math.floor(refreshLeft / (24*60*60*1000))} ngày` : 'Đã hết hạn'
      };
    } catch {
      return { hasAccessToken: false, hasRefreshToken: false };
    }
  };

  return (
    <DriveContext.Provider value={{
      isSignedIn,
      isLoading,
      signIn,
      signOut,
      checkSignInStatus,
      refreshToken,
      getTokenStatus,
      forceReAuthenticate,
      resetGoogleAPI
    }}>
      {children}
    </DriveContext.Provider>
  );
}

export function useDrive() {
  const context = useContext(DriveContext);
  if (context === undefined) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
}
