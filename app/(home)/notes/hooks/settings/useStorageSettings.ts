import { useState, useEffect, useCallback, useMemo } from 'react';
import { StorageProvider, StorageConfig, StorageStatus } from '../../types/storage';

import { driveService } from '../../services/googleDrive';
import { tursoService } from '../../services/tursoService';
import { secureLocalStorage } from '../../utils/security/secureLocalStorage';

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

  const [testingProviders, setTestingProviders] = useState<StorageProvider[]>([]);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [successAlert, setSuccessAlert] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: '' });

  const [storageStatus, setStorageStatus] = useState<StorageStatus>(() => {
    // Initialize with safe defaults
    const initialProvider = currentProvider || 'google-drive';
    return {
      currentProvider: initialProvider,
      isConnected: initialProvider === 'google-drive', // Google Drive is always configured
      isLoading: true,
    };
  });

  const [r2Config, setR2Config] = useState(() => ({
    bucket: '',
    region: 'auto',
    accessKeyId: '',
    secretAccessKey: '',
    accountId: '',
    publicUrl: '',
  }));

  const [tursoConfig, setTursoConfig] = useState(() => ({
    url: '',
    token: '',
  }));

  // Initial secure load + migrate plaintext if present
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      await Promise.all([
        secureLocalStorage.migrateIfPlaintext(R2_CONFIG_KEY),
        secureLocalStorage.migrateIfPlaintext(TURSO_CONFIG_KEY),
      ]);

      const [r2, turso] = await Promise.all([
        secureLocalStorage.getJSON<typeof r2Config>(R2_CONFIG_KEY),
        secureLocalStorage.getJSON<typeof tursoConfig>(TURSO_CONFIG_KEY),
      ]);

      setR2Config(r2 || { bucket: '', region: 'auto', accessKeyId: '', secretAccessKey: '', accountId: '', publicUrl: '' });
      setTursoConfig(turso || { url: '', token: '' });
      setIsConfigLoaded(true);
      setIsInitialLoad(false);
    })();
  }, []);

  // Storage configurations - memoized to prevent recreation on every render
  const storageConfigs: Record<StorageProvider, StorageConfig> = useMemo(() => ({
    'google-drive': {
      provider: 'google-drive',
      isConfigured: true,
      displayName: 'Google Drive',
      description: 'Store both notes and images in Google Drive',
      icon: '/providers/googledrive.png',
    },
    'r2-turso': {
      provider: 'r2-turso',
      isConfigured: isConfigLoaded && Boolean(
        r2Config.bucket && r2Config.accessKeyId && r2Config.secretAccessKey && 
        r2Config.accountId && r2Config.publicUrl &&
        tursoConfig.url && tursoConfig.token
      ),
      displayName: 'Cloudflare R2 + Turso',
      description: 'Store notes in Turso and images in R2',
      icon: '/providers/cloudflareturso.png',
    }
  }), [r2Config, tursoConfig, isConfigLoaded]);

  // Save current provider to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_PROVIDER_KEY, currentProvider);
      try {
        // Notify other hook instances in the same tab
        window.dispatchEvent(new CustomEvent('storage-provider-changed', { detail: { provider: currentProvider } }));
      } catch { }
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
      } catch { }
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

  // Save R2 config securely (only after initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    (async () => {
      if (typeof window === 'undefined') return;
      await secureLocalStorage.setJSON(R2_CONFIG_KEY, r2Config);
    })();
  }, [r2Config, isInitialLoad]);

  // Save Turso config securely (only after initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    (async () => {
      if (typeof window === 'undefined') return;
      await secureLocalStorage.setJSON(TURSO_CONFIG_KEY, tursoConfig);
    })();
  }, [tursoConfig, isInitialLoad]);

  // Update storage status when provider changes
  useEffect(() => {
    const config = storageConfigs[currentProvider];
    if (config) {
      setStorageStatus(prev => ({
        ...prev,
        currentProvider,
        isConnected: config.isConfigured,
        isLoading: !isConfigLoaded,
      }));
    }
  }, [currentProvider, storageConfigs, isConfigLoaded]);

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
        } catch { }
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
    setTestingProviders(prev => [...new Set(prev), provider]);

    // setStorageStatus(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      if (provider === 'google-drive') {
        // Test Google Drive connection
        const isSignedIn = await driveService.isSignedIn();
        if (!isSignedIn) {
          throw new Error('Not signed in to Google Drive');
        }

        // Try to list files to verify connection
        await driveService.listFiles();

      } else if (provider === 'r2-turso') {
        // Load configurations directly from secure storage to ensure we have the latest values
        let [r2Data, tursoData] = await Promise.all([
          secureLocalStorage.getJSON<typeof r2Config>(R2_CONFIG_KEY),
          secureLocalStorage.getJSON<typeof tursoConfig>(TURSO_CONFIG_KEY),
        ]);

        // Fallback to regular localStorage if secure storage fails
        if (!r2Data || !tursoData) {
          console.warn('Secure storage failed, trying regular localStorage fallback');
          const r2Raw = localStorage.getItem(R2_CONFIG_KEY);
          const tursoRaw = localStorage.getItem(TURSO_CONFIG_KEY);
          
          if (r2Raw) {
            try {
              r2Data = JSON.parse(r2Raw);
            } catch (e) {
              console.error('Failed to parse R2 config from localStorage:', e);
            }
          }
          
          if (tursoRaw) {
            try {
              tursoData = JSON.parse(tursoRaw);
            } catch (e) {
              console.error('Failed to parse Turso config from localStorage:', e);
            }
          }
        }


        // Test R2 + Turso connection
        if (!r2Data?.bucket || !r2Data?.accessKeyId || !r2Data?.secretAccessKey) {
          const missingFields = [];
          if (!r2Data?.bucket) missingFields.push('bucket');
          if (!r2Data?.accessKeyId) missingFields.push('accessKeyId');
          if (!r2Data?.secretAccessKey) missingFields.push('secretAccessKey');
          throw new Error(`R2 configuration incomplete. Missing: ${missingFields.join(', ')}`);
        }

        if (!tursoData?.url || !tursoData?.token) {
          const missingFields = [];
          if (!tursoData?.url) missingFields.push('url');
          if (!tursoData?.token) missingFields.push('token');
          throw new Error(`Turso configuration incomplete. Missing: ${missingFields.join(', ')}`);
        }

        // Test R2 and Turso connections with step-by-step feedback
        setSuccessAlert({
          show: true,
          message: 'Testing R2 connection...'
        });

        // Test R2 connection first
        const r2TestResponse = await fetch('/api/storage/r2/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucket: r2Data.bucket,
            region: r2Data.region || 'auto',
            accessKeyId: r2Data.accessKeyId,
            secretAccessKey: r2Data.secretAccessKey,
            accountId: r2Data.accountId,
          }),
        });

        // Check R2 connection result
        if (!r2TestResponse.ok) {
          const r2ErrorData = await r2TestResponse.json();
          throw new Error(`R2 connection failed: ${r2ErrorData.error || 'Please check your R2 configuration'}`);
        }

        setSuccessAlert({
          show: true,
          message: 'R2 connected successfully! Testing Turso connection...'
        });

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 800));

        // Test Turso connection second
        const tursoTestResponse = await fetch('/api/storage/turso/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: tursoData.url,
            token: tursoData.token,
          }),
        });

        // Check Turso connection result
        if (!tursoTestResponse.ok) {
          const tursoErrorData = await tursoTestResponse.json();
          throw new Error(`Turso connection failed: ${tursoErrorData.error || 'Please check your Turso configuration'}`);
        }

        setSuccessAlert({
          show: true,
          message: 'Turso connected successfully! Finalizing setup...'
        });

        // Small delay before final message
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // If we reach here, the test was successful
      setStorageStatus(prev => ({
        ...prev,
        isConnected: true,
        error: undefined,
      }));

      setSuccessAlert({
        show: true,
        message: provider === 'google-drive' 
          ? 'Connection test successful for Google Drive'
          : 'All connections successful!'
      });
      
      setTimeout(() => {
        setSuccessAlert({ show: false, message: '' });
      }, 3000);

      return true;

    } catch (error) {
      setStorageStatus(prev => ({
        ...prev,
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      }));

      return false;
    } finally {
      setTestingProviders(prev => {
        const newSet = prev.filter(p => p !== provider);
        return newSet;
      });
    }
  }, []);

  const isProviderTesting = useCallback((provider: StorageProvider) => {
    return testingProviders.includes(provider);
  }, [testingProviders]);

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
    isProviderTesting,
    successAlert,
    setSuccessAlert,
  };
};
