'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isEncryptedData } from '../(home)/notes/utils/security/encryption';
import { secureLocalStorage } from '../(home)/notes/utils/security/secureLocalStorage';

interface DriveContextType {
  isSignedIn: boolean;
  isLoading: boolean;
  isInitialized: boolean;
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
  const [isInitialized, setIsInitialized] = useState(false); // Track if auth has been properly initialized

  // Lazy-load the Google Drive module only when needed
  let driveModulePromise: Promise<typeof import('../(home)/notes/services/googleDrive')> | null = null;
  const loadDriveModule = () => {
    if (!driveModulePromise) {
      driveModulePromise = import('../(home)/notes/services/googleDrive');
    }
    return driveModulePromise;
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const resp = await fetch("/api/auth/google/drive/token", { method: "POST" });
        if (!cancelled && resp.ok) {
          const data = await resp.json();
          if (data?.access_token) {
            setIsSignedIn(true);
          } else {
            setIsSignedIn(false);
          }
        } else if (!cancelled) {
          setIsSignedIn(false);
        }
      } catch (e) {
        if (!cancelled) setIsSignedIn(false);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const checkSignInStatus = async () => {
    setIsLoading(true);
    try {
      // Check for both regular tokens and temporary tokens
  const tokenRaw = typeof window !== 'undefined' ? window.localStorage.getItem('google_drive_token') : null;
      const tempTokens = typeof window !== 'undefined' ? window.localStorage.getItem('google_drive_tokens_temp') : null;

  if (!tokenRaw && !tempTokens) {
        setIsSignedIn(false);
        return;
      }

      const mod = await loadDriveModule();
      const signedIn = await mod.driveService.isSignedIn();
      setIsSignedIn(!!signedIn);
    } catch (error) {
      console.error('Error checking sign-in status:', error);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    setIsLoading(true);
    try {
      const origin = encodeURIComponent(
        typeof window !== "undefined" ? window.location.pathname : "/"
      );
      window.location.href = `/api/auth/google/drive?origin=${origin}`;
    } finally {
      setIsLoading(false);
    }
  };

  // const signIn = async () => {
  //   setIsLoading(true);
  //   try {
  //     const mod = await loadDriveModule();
  //     const success = await mod.driveService.signIn();
  //     setIsSignedIn(!!success);
  //
  //     // Clear any old cache and reset authentication state in image manager
  //     if (success) {
  //       const { imageLoadingManager } = await import('../(home)/notes/_utils/imageLoadingManager');
  //       imageLoadingManager.clearCache();
  //     }
  //   } catch (error) {
  //     console.error('Sign in failed:', error);
  //     setIsSignedIn(false);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const signOut = async () => {
    try {
      const mod = await loadDriveModule();
      await mod.driveService.signOut();

      // Clear image cache when signing out
      const { imageLoadingManager } = await import('../(home)/notes/utils/images/imageLoadingManager');
      imageLoadingManager.clearCache();
      // Clear any temporary tokens from previous auth attempts
      try {
        localStorage.removeItem('google_drive_tokens_temp');
      } catch { }
    } catch { }
    setIsSignedIn(false);
  };

  const refreshToken = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch("/api/auth/google/drive/token", { method: "POST" });
      setIsSignedIn(resp.ok);
    } catch {
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // const refreshToken = async () => {
  //   setIsLoading(true);
  //   try {
  //     const mod = await loadDriveModule();
  //     const success = await mod.driveService.refreshAccessToken();
  //     setIsSignedIn(!!success);
  //   } catch (error) {
  //     console.error('Token refresh failed:', error);
  //     setIsSignedIn(false);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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
      let token: any = null;
      if (isEncryptedData(tokenRaw)) {
        // Note: this is a sync function. We cannot await; give best-effort by returning minimal info.
        // For more detail, the UI can call driveService.getTokenStatus() which performs async work.
        return { hasAccessToken: true, hasRefreshToken: true };
      } else {
        token = JSON.parse(tokenRaw);
      }
      const now = Date.now();
      const accessLeft = token.expires_at ? token.expires_at - now : 0;
      const refreshLeft = token.refresh_expires_at ? token.refresh_expires_at - now : 0;
      return {
        hasAccessToken: true,
        hasRefreshToken: !!token.refresh_token,
        timeUntilAccessExpiry: accessLeft > 0 ? `${Math.floor(accessLeft / 60000)} phút` : 'Đã hết hạn',
        timeUntilRefreshExpiry: refreshLeft > 0 ? `${Math.floor(refreshLeft / (24 * 60 * 60 * 1000))} ngày` : 'Đã hết hạn'
      };
    } catch {
      return { hasAccessToken: false, hasRefreshToken: false };
    }
  };

  return (
    <DriveContext.Provider value={{
      isSignedIn,
      isLoading,
      isInitialized,
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
