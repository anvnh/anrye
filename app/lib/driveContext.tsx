'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  let driveModulePromise: Promise<typeof import('./googleDrive')> | null = null;
  const loadDriveModule = () => {
    if (!driveModulePromise) {
      driveModulePromise = import('./googleDrive');
    }
    return driveModulePromise;
  };

  useEffect(() => {
    // Enhanced PWA authentication initialization with retry mechanism
    const initializeAuth = async (retryCount = 0) => {
      if (typeof window !== 'undefined') {
        try {
          // Check if preloader has run (via global flag)
          const preloaderStatus = typeof window !== 'undefined' && (window as any).__pwa_auth_preloaded;

          // Enhanced token processing for PWA with immediate localStorage check
          const temp = window.localStorage.getItem('google_drive_tokens_temp');
          if (temp) {
            try {

              const mod = await loadDriveModule();
              const ok = await mod.driveService.signIn();
              setIsSignedIn(!!ok);
              setIsLoading(false);
              setIsInitialized(true);
              
              // Clear temp tokens after processing
              localStorage.removeItem('google_drive_tokens_temp');
              return;
            } catch (error) {
              console.error('Error processing temp tokens:', error);
              localStorage.removeItem('google_drive_tokens_temp');
            }
          }



          // Check for existing tokens with immediate validation
          const tokenRaw = window.localStorage.getItem('google_drive_token');
          if (!tokenRaw) {
            setIsSignedIn(false);
            setIsLoading(false);
            setIsInitialized(true);
            return;
          }

          // Pre-validate token structure before async operations
          let tokenData;
          try {
            tokenData = JSON.parse(tokenRaw);
            if (!tokenData.access_token) {
              throw new Error('Invalid token structure');
            }
          } catch (e) {
            console.error('Invalid token in localStorage:', e);
            localStorage.removeItem('google_drive_token');
            setIsSignedIn(false);
            setIsLoading(false);
            setIsInitialized(true);
            return;
          }

          // Check if token is expired
          const now = Date.now();
          const isExpired = tokenData.expires_at && tokenData.expires_at < now;
          const hasRefreshToken = tokenData.refresh_token && tokenData.refresh_expires_at && tokenData.refresh_expires_at > now;

          if (isExpired && !hasRefreshToken) {
            // Token expired and no valid refresh token
            localStorage.removeItem('google_drive_token');
            setIsSignedIn(false);
            setIsLoading(false);
            setIsInitialized(true);
            return;
          }

          // Optimistically mark as signed-in for better UX
          setIsSignedIn(true);
          setIsLoading(false);
          setIsInitialized(true);

          // Validate token in background with enhanced retry mechanism for PWA
          const validateToken = async (validationRetryCount = 0) => {
            try {
              const mod = await loadDriveModule();
              mod.driveService.reloadSavedToken();
              const ok = await mod.driveService.isSignedIn();
              setIsSignedIn(!!ok);
              
              if (!ok && validationRetryCount < 3) {
                // Retry validation with exponential backoff for PWA compatibility
                setTimeout(() => validateToken(validationRetryCount + 1), 1000 * Math.pow(2, validationRetryCount));
              }
            } catch (error) {
              console.error(`Token validation attempt ${validationRetryCount + 1} failed:`, error);
              if (validationRetryCount < 2) {
                // Retry after a delay for PWA compatibility
                setTimeout(() => validateToken(validationRetryCount + 1), 1000 * (validationRetryCount + 1));
              } else {
                setIsSignedIn(false);
              }
            }
          };

          // Use requestIdleCallback for better performance, fallback to setTimeout
          const idle = (cb: () => void) =>
            (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 100);

          idle(() => validateToken());
        } catch (error) {
          console.error('Auth initialization error:', error);
          setIsSignedIn(false);
          setIsLoading(false);
          setIsInitialized(true);
          
          // Retry initialization for PWA if this is the first attempt
          if (retryCount < 2) {
            setTimeout(() => initializeAuth(retryCount + 1), 500 * (retryCount + 1));
          }
        }
      } else {
        setIsSignedIn(false);
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
    
    // Add postMessage listener for popup authentication flow (PWA support)
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        try {
          const tokens = event.data.tokens;
          
          // Store tokens temporarily
          localStorage.setItem('google_drive_tokens_temp', JSON.stringify(tokens));
          
          // Process tokens immediately
          const mod = await loadDriveModule();
          const ok = await mod.driveService.signIn();
          setIsSignedIn(!!ok);
          setIsInitialized(true);
          
          // Clear temp tokens
          localStorage.removeItem('google_drive_tokens_temp');
        } catch (error) {
          console.error('Error processing auth message:', error);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
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
