import { useState, useEffect, useCallback } from 'react';
import { maskSensitiveData } from '../../utils/security/encryption';
import { secureLocalStorage } from '../../utils/security/secureLocalStorage';

interface SecureStorageConfig {
  r2Config: {
    bucket: string;
    region: string;
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
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  tursoConfig: {
    url: string;
    token: string;
  };
  isInitialized: boolean;
}

const STORAGE_KEYS = {
  R2_CONFIG: 'r2-config',
  TURSO_CONFIG: 'turso-config',
} as const;

export const useSecureStorage = () => {
  const [state, setState] = useState<SecureStorageState>({
    r2Config: {
      bucket: '',
      region: 'auto',
      accessKeyId: '',
      secretAccessKey: '',
    },
    tursoConfig: {
      url: '',
      token: '',
    },
    isInitialized: false,
  });

  // Load configurations securely (migrates plaintext if found)
  const loadConfigurations = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // Migrate existing plaintext values, if any
      await Promise.all([
        secureLocalStorage.migrateIfPlaintext(STORAGE_KEYS.R2_CONFIG),
        secureLocalStorage.migrateIfPlaintext(STORAGE_KEYS.TURSO_CONFIG),
      ]);

      // Load R2 config
      const r2Data = await secureLocalStorage.getJSON<SecureStorageConfig['r2Config']>(STORAGE_KEYS.R2_CONFIG);
      let r2Config = {
        bucket: '',
        region: 'auto',
        accessKeyId: '',
        secretAccessKey: '',
      };

      if (r2Data) {
        r2Config = {
          bucket: r2Data.bucket || '',
          region: r2Data.region || 'auto',
          accessKeyId: r2Data.accessKeyId || '',
          secretAccessKey: r2Data.secretAccessKey || '',
        };
      }

      // Load Turso config
      const tursoData = await secureLocalStorage.getJSON<SecureStorageConfig['tursoConfig']>(STORAGE_KEYS.TURSO_CONFIG);
      let tursoConfig = {
        url: '',
        token: '',
      };

      if (tursoData) {
        tursoConfig = {
          url: tursoData.url || '',
          token: tursoData.token || '',
        };
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
  }, []);

  // Load configurations on mount
  useEffect(() => {
    if (!state.isInitialized) {
      loadConfigurations();
    }
  }, [state.isInitialized, loadConfigurations]);

  // Update R2 configuration (secure)
  const updateR2Config = useCallback(async (updates: Partial<SecureStorageConfig['r2Config']>) => {
    if (typeof window === 'undefined') return;

    try {
      const newConfig = {
        ...state.r2Config,
        ...updates,
      };

      const toStore = {
        bucket: newConfig.bucket,
        region: newConfig.region || 'auto',
        accessKeyId: newConfig.accessKeyId,
        secretAccessKey: newConfig.secretAccessKey,
      };

      await secureLocalStorage.setJSON(STORAGE_KEYS.R2_CONFIG, toStore);

      setState(prev => ({
        ...prev,
        r2Config: toStore,
      }));
    } catch (error) {
      console.error('Failed to update R2 config:', error);
    }
  }, [state.r2Config]);

  // Update Turso configuration (secure)
  const updateTursoConfig = useCallback(async (updates: Partial<SecureStorageConfig['tursoConfig']>) => {
    if (typeof window === 'undefined') return;

    try {
      const newConfig = {
        ...state.tursoConfig,
        ...updates,
      };

      const toStore = {
        url: newConfig.url,
        token: newConfig.token,
      };

      await secureLocalStorage.setJSON(STORAGE_KEYS.TURSO_CONFIG, toStore);

      setState(prev => ({
        ...prev,
        tursoConfig: toStore,
      }));
    } catch (error) {
      console.error('Failed to update Turso config:', error);
    }
  }, [state.tursoConfig]);

  // Get masked values for display
  const getMaskedR2Config = useCallback(() => ({
    bucket: state.r2Config.bucket,
    region: state.r2Config.region,
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
    region: state.r2Config.region,
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
  // Remove legacy password if it exists
  localStorage.removeItem('encryption-password');

    setState(prev => ({
      ...prev,
      r2Config: {
        bucket: '',
        region: 'auto',
        accessKeyId: '',
        secretAccessKey: '',
      },
      tursoConfig: {
        url: '',
        token: '',
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
