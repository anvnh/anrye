'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useStorageSettings } from '../../hooks/settings/useStorageSettings';
import { useSecureStorage } from '../../hooks/security/useSecureStorage';
import { StorageProvider } from '../../types/storage';
import { CheckCircle, XCircle, Loader2, Settings, Cloud, Database, AlertCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeSettings } from '../../hooks/ui/useThemeSettings';
import { SecureInput } from './SecureInput';
import Image from 'next/image';

interface StorageSwitcherProps {
  className?: string;
}

export function StorageSwitcher({ className }: StorageSwitcherProps) {

  const { notesTheme } = useThemeSettings();

  const [fileUploadError, setFileUploadError] = useState<string>('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const {
    currentProvider,
    storageStatus,
    storageConfigs,
    switchProvider,
    testConnection,
    isProviderTesting,
    successAlert,
    setSuccessAlert,
  } = useStorageSettings();

  const {
    r2Config,
    tursoConfig,
    updateR2Config,
    updateTursoConfig,
    getMaskedR2Config,
    getMaskedTursoConfig,
    getPlainR2Config,
    getPlainTursoConfig,
    isInitialized: isSecureStorageInitialized,
  } = useSecureStorage();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleProviderSwitch = async (provider: StorageProvider) => {
    if (provider === currentProvider) return;
    
    await switchProvider(provider);
  };

  const handleTestConnection = async (provider: StorageProvider) => {
    if (provider === 'google-drive') {
      await testConnection('google-drive');
    } else if (provider === 'r2-turso') {
      // Test connection directly without modifying configuration
      await testConnection('r2-turso');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setFileUploadError('');

    try {
      const text = await file.text();
      const lines = text.split('\n');
      let bucketName = '';
      let accessKeyId = '';
      let region = 'auto';
      let secretAccessKey = '';
      let databaseUrl = '';
      let authToken = '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('BUCKET_NAME=')) {
          const value = trimmedLine.split('=')[1]?.trim() || '';
          bucketName = value.startsWith('"') && value.endsWith('"') 
            ? value.slice(1, -1) 
            : value.replace(/['"]/g, '');
        } else if (trimmedLine.startsWith('ACCESS_KEY_ID=')) {
          const value = trimmedLine.split('=')[1]?.trim() || '';
          accessKeyId = value.startsWith('"') && value.endsWith('"') 
            ? value.slice(1, -1) 
            : value.replace(/['"]/g, '');
        } else if (trimmedLine.startsWith('SECRET_ACCESS_KEY=')) {
          const value = trimmedLine.split('=')[1]?.trim() || '';
          secretAccessKey = value.startsWith('"') && value.endsWith('"') 
            ? value.slice(1, -1) 
            : value.replace(/['"]/g, '');
        } else if (trimmedLine.startsWith('REGION=')) {
          const value = trimmedLine.split('=')[1]?.trim() || '';
          region = value.startsWith('"') && value.endsWith('"') 
            ? value.slice(1, -1) 
            : value.replace(/['"]/g, '') || 'auto';
        } else if (trimmedLine.startsWith('DATABASE_URL=')) {
          const value = trimmedLine.split('=')[1]?.trim() || '';
          databaseUrl = value.startsWith('"') && value.endsWith('"') 
            ? value.slice(1, -1) 
            : value.replace(/['"]/g, '');
        } else if (trimmedLine.startsWith('AUTH_TOKEN=')) {
          const value = trimmedLine.split('=')[1]?.trim() || '';
          authToken = value.startsWith('"') && value.endsWith('"') 
            ? value.slice(1, -1) 
            : value.replace(/['"]/g, '');
        }
      }

      if (!bucketName || !accessKeyId || !secretAccessKey || !databaseUrl || !authToken) {
        throw new Error('File must contain all required fields: BUCKET_NAME, ACCESS_KEY_ID, SECRET_ACCESS_KEY, DATABASE_URL, AUTH_TOKEN (optional REGION, default auto)');
      }

      console.log('Uploading R2 config:', { bucket: bucketName, region, accessKeyId: accessKeyId ? 'present' : 'missing', secretAccessKey: secretAccessKey ? 'present' : 'missing' });
      await updateR2Config({
        bucket: bucketName,
        region,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      });

      console.log('Uploading Turso config:', { url: databaseUrl, token: authToken ? 'present' : 'missing' });
      await updateTursoConfig({
        url: databaseUrl,
        token: authToken,
      });

      console.log('Configuration upload completed successfully');

      // Small delay to ensure configuration is fully persisted
      await new Promise(resolve => setTimeout(resolve, 100));

      setSuccessAlert({
        show: true,
        message: 'Configuration file uploaded successfully! All fields have been filled.'
      });

      setTimeout(() => {
        setSuccessAlert({ show: false, message: '' });
      }, 3000);

    } catch (error) {
      setFileUploadError(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsUploadingFile(false);
      event.target.value = '';
    }
  };

  const getStatusBadge = (provider: StorageProvider) => {
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn(
            "text-lg font-semibold",
            notesTheme === 'light' ? 'text-black' : 'text-white'
          )}>
            Storage Provider
          </h3>
          <p className={cn(
            "text-sm text-muted-foreground",
            notesTheme === 'light' ? 'text-black' : 'text-white'
          )}>
            Choose where to store your notes and images
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={!isSecureStorageInitialized}
          className={cn(
            "text-sm text-muted-foreground",
            notesTheme === 'light' ? 'text-black' : 'text-white'
          )}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced
          {!isSecureStorageInitialized && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </Button>
      </div>

      {/* Success Alert */}
      {successAlert.show && (
        <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {successAlert.message}
          </AlertDescription>
        </Alert>
      )}

      {storageStatus.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{storageStatus.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(storageConfigs).map(([key, config]) => {
          const provider = key as StorageProvider;
          const isCurrent = provider === currentProvider;
          const isConfigured = config.isConfigured;
          const isTesting = isProviderTesting(provider);

          return (
            <Card 
              key={provider} 
              className={cn(
                "cursor-pointer transition-all duration-200 border-none",
                isCurrent 
                  ? (notesTheme === 'light' ? 'bg-black text-white' : 'bg-gray-300 text-black')
                  : (notesTheme === 'light' ? 'bg-white text-black' : 'bg-secondary text-white'),
                'hover:shadow-md'
              )}
              onClick={() => handleProviderSwitch(provider)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  {/* <span className="text-2xl">{config.icon}</span> */}
                  <Image
                    src={config.icon}
                    alt={config.displayName}
                    width={config.displayName === 'Cloudflare R2 + Turso' ? 80 : 34}
                    height={config.displayName === 'Cloudflare R2 + Turso' ? 80 : 34}
                  />
                  <div>
                    <CardTitle className="text-base">{config.displayName}</CardTitle>
                    <CardDescription className={cn(
                      "text-sm",
                      isCurrent 
                        ? (notesTheme === 'light' ? 'text-gray-300' : 'text-gray-600')
                        : (notesTheme === 'light' ? 'text-gray-600' : 'text-gray-400')
                    )}>
                      {config.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Switch
                      checked={isCurrent}
                      onCheckedChange={() => handleProviderSwitch(provider)}
                      disabled={storageStatus.isLoading}
                    />
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(provider)}
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          isCurrent 
                            ? (notesTheme === 'light' ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300')
                            : (notesTheme === 'light' ? 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300' : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600')
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(provider);
                        }}
                        disabled={isProviderTesting(provider)}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showAdvanced && (
        <div className="space-y-6">
          <Separator 
            className={cn(
              "bg-gray-200",
              notesTheme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
            )}
          />
          
          <div>
            <h4 className={cn(
              "text-md font-medium mb-4 flex items-center",
              notesTheme === 'light' ? 'text-black' : 'text-white'
            )}>
              <Cloud className="h-4 w-4 mr-2" />
              Cloudflare R2 Configuration
            </h4>
            
            <div className="mb-6 p-4 border-2 border-dashed border-gray-700 rounded-lg">
              <label htmlFor="config-file-upload" className="flex flex-col items-center justify-center w-full cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> configuration file
                  </p>
                  <p className="text-xs text-gray-500">
                    Upload a .txt file with BUCKET_NAME, ACCESS_KEY_ID, SECRET_ACCESS_KEY, DATABASE_URL, AUTH_TOKEN
                  </p>
                </div>
                <input 
                  id="config-file-upload" 
                  type="file" 
                  className="hidden" 
                  accept=".txt"
                  onChange={handleFileUpload}
                  disabled={isUploadingFile}
                />
              </label>
              {isUploadingFile && (
                <div className="flex items-center justify-center mt-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Processing file...</span>
                </div>
              )}
              {fileUploadError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fileUploadError}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="r2-bucket" className={cn(
                  "text-sm font-medium",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>Bucket Name</Label>
                <Input
                  id="r2-bucket"
                  value={r2Config.bucket}
                  onChange={(e) => updateR2Config({ bucket: e.target.value })}
                  placeholder="my-bucket"
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
              <div className="space-y-2">
                <SecureInput
                  id="r2-access-key"
                  label="Access Key ID"
                  value={r2Config.accessKeyId}
                  onChange={(value) => updateR2Config({ accessKeyId: value })}
                  placeholder="Access Key ID"
                  isSensitive={true}
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
              <div className="space-y-2">
                <SecureInput
                  id="r2-secret-key"
                  label="Secret Access Key"
                  value={r2Config.secretAccessKey}
                  onChange={(value) => updateR2Config({ secretAccessKey: value })}
                  placeholder="Secret Access Key"
                  isSensitive={true}
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className={cn(
              "text-md font-medium mb-4 flex items-center",
              notesTheme === 'light' ? 'text-black' : 'text-white'
            )}>
              <Database className="h-4 w-4 mr-2" />
              Turso Database Configuration
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <SecureInput
                  id="turso-url"
                  label="Database URL"
                  value={tursoConfig.url}
                  onChange={(value) => updateTursoConfig({ url: value })}
                  placeholder="libsql://your-db.turso.io"
                  isSensitive={false}
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
              <div className="space-y-2">
                <SecureInput
                  id="turso-token"
                  label="Auth Token"
                  value={tursoConfig.token}
                  onChange={(value) => updateTursoConfig({ token: value })}
                  placeholder="Auth Token"
                  isSensitive={true}
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
            </div>
          </div>

          <Alert className={cn(
            "border-none mb-8",
            notesTheme === 'light' ? 'bg-main' : 'bg-secondary'
          )}>
            <AlertCircle className={cn(
              "h-4 w-4",
            )} />
            <AlertDescription className={cn(
              "text-sm",
              notesTheme === 'light' ? 'text-white' : 'text-white'
            )}>
              <strong>Security Note:</strong> Your credentials are now encrypted and stored locally in your browser. 
              Keep your device secure and don't share credentials.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
