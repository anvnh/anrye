import { useState, useEffect, useCallback } from 'react';
import { secureLocalStorage } from '../../(home)/notes/utils/security/secureLocalStorage';
import { isEncryptedData } from '../../(home)/notes/utils/security/encryption';

type TokenData = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  refresh_expires_at?: number;
};

interface UseAuthStateOptions {
  onAuthSuccess?: () => void;
  onAuthFailure?: () => void;
  retryCount?: number;
  retryDelay?: number;
}

export function useAuthState(options: UseAuthStateOptions = {}) {
  const {
    onAuthSuccess,
    onAuthFailure,
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);

  const checkAuthState = useCallback(async (attempt = 0) => {
    if (typeof window === 'undefined') {
      setIsAuthenticated(false);
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    try {
      // Check for temporary tokens first (PWA compatibility)
      const tempTokens = localStorage.getItem('google_drive_tokens_temp');
      if (tempTokens) {
        try {
          const tokens = JSON.parse(tempTokens);
          if (tokens.access_token) {
            // Process temporary tokens
            const { driveService } = await import('../../(home)/notes/services/googleDrive');
            const success = await driveService.signIn();
            setIsAuthenticated(!!success);
            setIsLoading(false);
            setIsInitialized(true);
            
            if (success) {
              onAuthSuccess?.();
            } else {
              onAuthFailure?.();
            }
            
            localStorage.removeItem('google_drive_tokens_temp');
            return;
          }
        } catch (error) {
          console.error('Error processing temp tokens:', error);
          localStorage.removeItem('google_drive_tokens_temp');
        }
      }

      // Check for existing tokens (encrypted or plaintext)
      const tokenRawLocal = localStorage.getItem('google_drive_token');
      let tokenData: TokenData | null = null;
      if (!tokenRawLocal) {
        setIsAuthenticated(false);
        setIsLoading(false);
        setIsInitialized(true);
        onAuthFailure?.();
        return;
      }
      try {
        if (isEncryptedData(tokenRawLocal)) {
          tokenData = await secureLocalStorage.getJSON<TokenData>('google_drive_token');
        } else {
          tokenData = JSON.parse(tokenRawLocal);
        }
        if (!tokenData || !tokenData.access_token) throw new Error('Invalid token structure');
      } catch (e) {
        console.error('Invalid token in localStorage:', e);
        localStorage.removeItem('google_drive_token');
        setIsAuthenticated(false);
        setIsLoading(false);
        setIsInitialized(true);
        onAuthFailure?.();
        return;
      }

      // Check token expiry
      const now = Date.now();
      const isExpired = tokenData.expires_at && tokenData.expires_at < now;
      const hasRefreshToken = tokenData.refresh_token && tokenData.refresh_expires_at && tokenData.refresh_expires_at > now;

      if (isExpired && !hasRefreshToken) {
        localStorage.removeItem('google_drive_token');
        setIsAuthenticated(false);
        setIsLoading(false);
        setIsInitialized(true);
        onAuthFailure?.();
        return;
      }

      // Optimistically set as authenticated for better UX
      setIsAuthenticated(true);
      setIsLoading(false);
      setIsInitialized(true);

      // Validate token in background
      const { driveService } = await import('../../(home)/notes/services/googleDrive');
      const isValid = await driveService.isSignedIn();
      
      if (isValid) {
        setIsAuthenticated(true);
        onAuthSuccess?.();
      } else {
        setIsAuthenticated(false);
        onAuthFailure?.();
        
        // Retry if we haven't exceeded retry count
        if (attempt < retryCount) {
          setRetryAttempts(attempt + 1);
          setTimeout(() => checkAuthState(attempt + 1), retryDelay * Math.pow(2, attempt));
        }
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
      setIsAuthenticated(false);
      setIsLoading(false);
      setIsInitialized(true);
      onAuthFailure?.();
      
      // Retry on error if we haven't exceeded retry count
      if (attempt < retryCount) {
        setRetryAttempts(attempt + 1);
        setTimeout(() => checkAuthState(attempt + 1), retryDelay * Math.pow(2, attempt));
      }
    }
  }, [onAuthSuccess, onAuthFailure, retryCount, retryDelay]);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // Listen for auth success messages from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        try {
          const tokens = event.data.tokens;
          localStorage.setItem('google_drive_tokens_temp', JSON.stringify(tokens));
          await checkAuthState();
        } catch (error) {
          console.error('Error processing auth message:', error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuthState]);

  const refreshAuthState = useCallback(() => {
    setIsLoading(true);
    checkAuthState();
  }, [checkAuthState]);

  return {
    isAuthenticated,
    isLoading,
    isInitialized,
    retryAttempts,
    refreshAuthState
  };
}
