import { useState, useEffect, useCallback } from 'react';
import { encryptSensitiveData, decryptSensitiveData, generateEncryptionPassword, maskSensitiveData, isEncryptedData } from '../../utils/security/encryption';

interface SecureStorageConfig {
  r2Config: {
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  tursoConfig: {
    url: string;
    token: string;
  };
}

interface SecureStorageState {
  r2Config: {
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    isEncrypted: boolean;
  };
  tursoConfig: {
    url: string;
    token: string;
    isEncrypted: boolean;
  };
  isInitialized: boolean;
  encryptionPassword: string | null;
}

const STORAGE_KEYS = {
  R2_CONFIG: 'secure-r2-config',
  TURSO_CONFIG: 'secure-turso-config',
  ENCRYPTION_PASSWORD: 'encryption-password',
} as const;

export const useSecureStorage = () => {
  const [state, setState] = useState<SecureStorageState>({
    r2Config: {
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
      isEncrypted: false,
    },
    tursoConfig: {
      url: '',
      token: '',
      isEncrypted: false,
    },
    isInitialized: false,
    encryptionPassword: null,
  });

  // Initialize encryption password
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let password = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_PASSWORD);
    if (!password) {
      password = generateEncryptionPassword();
      localStorage.setItem(STORAGE_KEYS.ENCRYPTION_PASSWORD, password);
    }

    setState(prev => ({
      ...prev,
      encryptionPassword: password,
    }));
  }, []);

  // Load encrypted configurations
  const loadConfigurations = useCallback(async () => {
    if (!state.encryptionPassword || typeof window === 'undefined') return;

    try {
      // Load R2 config
      const r2Data = localStorage.getItem(STORAGE_KEYS.R2_CONFIG);
      let r2Config = {
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        isEncrypted: false,
      };

      if (r2Data) {
        if (isEncryptedData(r2Data)) {
          const decrypted = await decryptSensitiveData(r2Data, state.encryptionPassword!);
          const parsed = JSON.parse(decrypted);
          r2Config = {
            ...parsed,
            isEncrypted: true,
          };
        } else {
          // Migrate old unencrypted data
          const parsed = JSON.parse(r2Data);
          r2Config = {
            ...parsed,
            isEncrypted: false,
          };
        }
      }

      // Load Turso config
      const tursoData = localStorage.getItem(STORAGE_KEYS.TURSO_CONFIG);
      let tursoConfig = {
        url: '',
        token: '',
        isEncrypted: false,
      };

      if (tursoData) {
        if (isEncryptedData(tursoData)) {
          const decrypted = await decryptSensitiveData(tursoData, state.encryptionPassword!);
          const parsed = JSON.parse(decrypted);
          tursoConfig = {
            ...parsed,
            isEncrypted: true,
          };
        } else {
          // Migrate old unencrypted data
          const parsed = JSON.parse(tursoData);
          tursoConfig = {
            ...parsed,
            isEncrypted: false,
          };
        }
      }

      setState(prev => ({
        ...prev,
        r2Config,
        tursoConfig,
        isInitialized: true,
      }));
    } catch (error) {
      console.error('Failed to load configurations:', error);
      setState(prev => ({
        ...prev,
        isInitialized: true,
      }));
    }
  }, [state.encryptionPassword]);

  // Load configurations when password is ready
  useEffect(() => {
    if (state.encryptionPassword && !state.isInitialized) {
      loadConfigurations();
    }
  }, [state.encryptionPassword, state.isInitialized, loadConfigurations]);

  // Update R2 configuration
  const updateR2Config = useCallback(async (updates: Partial<SecureStorageConfig['r2Config']>) => {
    if (!state.encryptionPassword || typeof window === 'undefined') return;

    try {
      const newConfig = {
        ...state.r2Config,
        ...updates,
      };

      // Encrypt sensitive fields
      const configToStore = {
        bucket: newConfig.bucket,
        accessKeyId: newConfig.accessKeyId,
        secretAccessKey: newConfig.secretAccessKey,
      };

      const encrypted = await encryptSensitiveData(
        JSON.stringify(configToStore),
        state.encryptionPassword
      );

      localStorage.setItem(STORAGE_KEYS.R2_CONFIG, encrypted);

      setState(prev => ({
        ...prev,
        r2Config: {
          ...newConfig,
          isEncrypted: true,
        },
      }));
    } catch (error) {
      console.error('Failed to update R2 config:', error);
    }
  }, [state.encryptionPassword, state.r2Config]);

  // Update Turso configuration
  const updateTursoConfig = useCallback(async (updates: Partial<SecureStorageConfig['tursoConfig']>) => {
    if (!state.encryptionPassword || typeof window === 'undefined') return;

    try {
      const newConfig = {
        ...state.tursoConfig,
        ...updates,
      };

      // Encrypt sensitive fields
      const configToStore = {
        url: newConfig.url,
        token: newConfig.token,
      };

      const encrypted = await encryptSensitiveData(
        JSON.stringify(configToStore),
        state.encryptionPassword
      );

      localStorage.setItem(STORAGE_KEYS.TURSO_CONFIG, encrypted);

      setState(prev => ({
        ...prev,
        tursoConfig: {
          ...newConfig,
          isEncrypted: true,
        },
      }));
    } catch (error) {
      console.error('Failed to update Turso config:', error);
    }
  }, [state.encryptionPassword, state.tursoConfig]);

  // Get masked values for display
  const getMaskedR2Config = useCallback(() => ({
    bucket: state.r2Config.bucket,
    accessKeyId: state.r2Config.accessKeyId ? maskSensitiveData(state.r2Config.accessKeyId, 4) : '',
    secretAccessKey: state.r2Config.secretAccessKey ? maskSensitiveData(state.r2Config.secretAccessKey, 4) : '',
  }), [state.r2Config]);

  const getMaskedTursoConfig = useCallback(() => ({
    url: state.tursoConfig.url,
    token: state.tursoConfig.token ? maskSensitiveData(state.tursoConfig.token, 4) : '',
  }), [state.tursoConfig]);

  // Get plain values for API calls (only when needed)
  const getPlainR2Config = useCallback(() => ({
    bucket: state.r2Config.bucket,
    accessKeyId: state.r2Config.accessKeyId,
    secretAccessKey: state.r2Config.secretAccessKey,
  }), [state.r2Config]);

  const getPlainTursoConfig = useCallback(() => ({
    url: state.tursoConfig.url,
    token: state.tursoConfig.token,
  }), [state.tursoConfig]);

  // Clear all sensitive data
  const clearSensitiveData = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(STORAGE_KEYS.R2_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.TURSO_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.ENCRYPTION_PASSWORD);

    setState(prev => ({
      ...prev,
      r2Config: {
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        isEncrypted: false,
      },
      tursoConfig: {
        url: '',
        token: '',
        isEncrypted: false,
      },
    }));
  }, []);

  return {
    r2Config: state.r2Config,
    tursoConfig: state.tursoConfig,
    isInitialized: state.isInitialized,
    updateR2Config,
    updateTursoConfig,
    getMaskedR2Config,
    getMaskedTursoConfig,
    getPlainR2Config,
    getPlainTursoConfig,
    clearSensitiveData,
  };
};
