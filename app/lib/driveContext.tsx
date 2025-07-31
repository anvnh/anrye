'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { driveService } from './googleDrive';

interface DriveContextType {
  isSignedIn: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSignInStatus: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getTokenStatus: () => any;
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export function DriveProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  useEffect(() => {
    // On client-side mount, load saved token and check status
    const initializeAuth = async () => {
      if (typeof window !== 'undefined') {
        // Re-load saved token on client-side
        driveService.reloadSavedToken();
      }
      await checkSignInStatus();
    };
    
    initializeAuth();
  }, []);

  const checkSignInStatus = async () => {
    try {
      console.log('Checking Google Drive sign-in status...');
      const signedIn = await driveService.isSignedIn();
      console.log('Sign-in status:', signedIn);
      setIsSignedIn(signedIn);
    } catch (error) {
      console.log('Error checking sign-in status:', error);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    console.log('Attempting to sign in to Google Drive...');
    setIsLoading(true);
    try {
      const success = await driveService.signIn();
      console.log('Sign-in result:', success);
      if (success) {
        setIsSignedIn(true);
      } else {
        console.error('Sign-in returned false');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
    setIsLoading(false);
  };

  const signOut = async () => {
    await driveService.signOut();
    setIsSignedIn(false);
  };

  const refreshToken = async () => {
    setIsLoading(true);
    try {
      const success = await driveService.refreshToken();
      if (success) {
        setIsSignedIn(true);
      } else {
        setIsSignedIn(false);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setIsSignedIn(false);
    }
    setIsLoading(false);
  };

  const getTokenStatus = () => {
    return driveService.getTokenStatus();
  };

  return (
    <DriveContext.Provider value={{
      isSignedIn,
      isLoading,
      signIn,
      signOut,
      checkSignInStatus,
      refreshToken,
      getTokenStatus
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
