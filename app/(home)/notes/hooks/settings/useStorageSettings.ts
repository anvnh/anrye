import { useState, useEffect, useCallback, useMemo } from 'react';
import { StorageProvider, StorageConfig, StorageStatus } from '../../types/storage';

const STORAGE_PROVIDER_KEY = 'storage-provider';
const R2_CONFIG_KEY = 'r2-config';
const TURSO_CONFIG_KEY = 'turso-config';

export const useStorageSettings = () => {
  const [currentProvider, setCurrentProvider] = useState<StorageProvider>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_PROVIDER_KEY) as StorageProvider) || 'google-drive';
    }
    return 'google-drive';
  });

  const [storageStatus, setStorageStatus] = useState<StorageStatus>(() => {
    // Initialize with safe defaults
    const initialProvider = currentProvider || 'google-drive';
    return {
      currentProvider: initialProvider,
      isConnected: initialProvider === 'google-drive', // Google Drive is always configured
      isLoading: true,
    };
  });

  const [r2Config, setR2Config] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(R2_CONFIG_KEY);
      return stored ? JSON.parse(stored) : {
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
      };
    }
    return {
      bucket: '',
      accessKeyId: '',
      secretAccessKey: '',
    };
  });

  const [tursoConfig, setTursoConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(TURSO_CONFIG_KEY);
      return stored ? JSON.parse(stored) : {
        url: '',
        token: '',
      };
    }
    return {
      url: '',
      token: '',
    };
  });

  // Storage configurations - memoized to prevent recreation on every render
  const storageConfigs: Record<StorageProvider, StorageConfig> = useMemo(() => ({
    'google-drive': {
      provider: 'google-drive',
      isConfigured: true,
      displayName: 'Google Drive',
      description: 'Store your notes and images in Google Drive',
      icon: '📁',
    },
    'r2-turso': {
      provider: 'r2-turso',
      isConfigured: r2Config.bucket && r2Config.accessKeyId && r2Config.secretAccessKey && 
                   tursoConfig.url && tursoConfig.token,
      displayName: 'Cloudflare R2 + Turso',
      description: 'Store images in R2 and notes in Turso database',
      icon: '☁️',
    }
  }), [r2Config, tursoConfig]);

  // Save current provider to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PROVIDER_KEY, currentProvider);
      try {
        // Notify other hook instances in the same tab
        window.dispatchEvent(new CustomEvent('storage-provider-changed', { detail: { provider: currentProvider } }));
      } catch {}
    }
  }, [currentProvider]);

  // Listen for provider changes from elsewhere (same tab via custom event, other tabs via storage)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustom = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        const provider = custom?.detail?.provider as StorageProvider | undefined;
        if (provider && provider !== currentProvider) {
          setCurrentProvider(provider);
        }
      } catch {}
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_PROVIDER_KEY && e.newValue) {
        const provider = e.newValue as StorageProvider;
        if (provider && provider !== currentProvider) {
          setCurrentProvider(provider);
        }
      }
    };

    window.addEventListener('storage-provider-changed', handleCustom as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage-provider-changed', handleCustom as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentProvider]);

  // Save R2 config to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(R2_CONFIG_KEY, JSON.stringify(r2Config));
    }
  }, [r2Config]);

  // Save Turso config to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TURSO_CONFIG_KEY, JSON.stringify(tursoConfig));
    }
  }, [tursoConfig]);

  // Update storage status when provider changes
  useEffect(() => {
    const config = storageConfigs[currentProvider];
    if (config) {
      setStorageStatus(prev => ({
        ...prev,
        currentProvider,
        isConnected: config.isConfigured,
      }));
    }
  }, [currentProvider, storageConfigs]);

  const switchProvider = useCallback(async (provider: StorageProvider) => {
    setStorageStatus(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      // Here you would implement the actual switching logic
      // For now, we'll just update the provider
      setCurrentProvider(provider);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_PROVIDER_KEY, provider);
        try {
          window.dispatchEvent(new CustomEvent('storage-provider-changed', { detail: { provider } }));
        } catch {}
      }
      
      // Simulate connection check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const config = storageConfigs[provider];
      setStorageStatus({
        currentProvider: provider,
        isConnected: config ? config.isConfigured : false,
        isLoading: false,
      });
    } catch (error) {
      setStorageStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to switch storage provider',
      }));
    }
  }, [storageConfigs]);

  const updateR2Config = useCallback((config: Partial<typeof r2Config>) => {
    setR2Config((prev: typeof r2Config) => ({ ...prev, ...config }));
  }, []);

  const updateTursoConfig = useCallback((config: Partial<typeof tursoConfig>) => {
    setTursoConfig((prev: typeof tursoConfig) => ({ ...prev, ...config }));
  }, []);

  const testConnection = useCallback(async (provider: StorageProvider) => {
    setStorageStatus(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      // Here you would implement actual connection testing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStorageStatus(prev => ({
        ...prev,
        isConnected: true,
        isLoading: false,
      }));
      
      return true;
    } catch (error) {
      setStorageStatus(prev => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      }));
      
      return false;
    }
  }, []);

  return {
    currentProvider,
    storageStatus,
    storageConfigs,
    r2Config,
    tursoConfig,
    switchProvider,
    updateR2Config,
    updateTursoConfig,
    testConnection,
  };
};
