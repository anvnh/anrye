import { useState, useCallback } from 'react';
import { 
  encryptNote, 
  decryptNote, 
  evaluatePasswordStrength,
  type EncryptedData,
  type EncryptionResult,
  type DecryptionResult 
} from '../utils/encryptionUtils';

export interface UseEncryptionState {
  isEncrypting: boolean;
  isDecrypting: boolean;
  error: string | null;
  lastEncrypted: EncryptedData | null;
}

export interface UseEncryptionActions {
  encrypt: (content: string, password: string) => Promise<EncryptionResult>;
  decrypt: (encryptedData: EncryptedData, password: string) => Promise<DecryptionResult>;
  clearError: () => void;
  reset: () => void;
}

export type UseEncryptionReturn = UseEncryptionState & UseEncryptionActions;

/**
 * React hook for note encryption/decryption
 */
export function useEncryption(): UseEncryptionReturn {
  const [state, setState] = useState<UseEncryptionState>({
    isEncrypting: false,
    isDecrypting: false,
    error: null,
    lastEncrypted: null,
  });

  const encrypt = useCallback(async (content: string, password: string): Promise<EncryptionResult> => {
    setState(prev => ({ ...prev, isEncrypting: true, error: null }));
    
    try {
      const result = await encryptNote(content, password);
      
      setState(prev => ({
        ...prev,
        isEncrypting: false,
        error: result.success ? null : result.error || 'Encryption failed',
        lastEncrypted: result.success ? result.data || null : null,
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
      setState(prev => ({
        ...prev,
        isEncrypting: false,
        error: errorMessage,
      }));
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const decrypt = useCallback(async (encryptedData: EncryptedData, password: string): Promise<DecryptionResult> => {
    setState(prev => ({ ...prev, isDecrypting: true, error: null }));
    
    try {
      const result = await decryptNote(encryptedData, password);
      
      setState(prev => ({
        ...prev,
        isDecrypting: false,
        error: result.success ? null : result.error || 'Decryption failed',
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
      setState(prev => ({
        ...prev,
        isDecrypting: false,
        error: errorMessage,
      }));
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isEncrypting: false,
      isDecrypting: false,
      error: null,
      lastEncrypted: null,
    });
  }, []);

  return {
    ...state,
    encrypt,
    decrypt,
    clearError,
    reset,
  };
}

/**
 * Hook for password strength evaluation with real-time feedback
 */
export function usePasswordStrength(password: string) {
  const strength = evaluatePasswordStrength(password);
  
  const getStrengthColor = () => {
    switch (strength.strength) {
      case 'very-weak': return 'text-red-600';
      case 'weak': return 'text-red-500';
      case 'fair': return 'text-yellow-500';
      case 'good': return 'text-blue-500';
      case 'strong': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStrengthProgress = () => {
    return (strength.score / 4) * 100;
  };

  return {
    strength: strength.strength,
    score: strength.score,
    feedback: strength.feedback,
    color: getStrengthColor(),
    progress: getStrengthProgress(),
    isStrong: strength.score >= 3,
  };
}
