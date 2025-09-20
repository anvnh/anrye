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
import { StorageProvider } from '../../types/storage';
import { CheckCircle, XCircle, Loader2, Settings, Cloud, Database, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeSettings } from '../../hooks/ui/useThemeSettings';
import Image from 'next/image';

interface StorageSwitcherProps {
  className?: string;
}

export function StorageSwitcher({ className }: StorageSwitcherProps) {

  const { notesTheme } = useThemeSettings();

  const {
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
  } = useStorageSettings();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleProviderSwitch = async (provider: StorageProvider) => {
    if (provider === currentProvider) return;
    
    await switchProvider(provider);
  };

  const handleTestConnection = async (provider: StorageProvider) => {
      await testConnection(provider);
  };

  const getStatusBadge = (provider: StorageProvider) => {
    if (provider === currentProvider) {
      return (
        <Badge 
          variant={storageStatus.isConnected ? "default" : "destructive"}
          className={cn(
            "text-[13px]",
            notesTheme === 'light' ? 'text-black' : 'text-white',
            storageStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
          )}
        >
          {storageStatus.isConnected ? "Connected" : "Disconnected"}
        </Badge>
      );
    }
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
          className={cn(
            "text-sm text-muted-foreground",
            notesTheme === 'light' ? 'text-black' : 'text-white'
          )}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced
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
                        disabled={!isConfigured || isProviderTesting(provider)}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Test'
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
                <Label htmlFor="r2-access-key" className={cn(
                  "text-sm font-medium",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>Access Key ID</Label>
                <Input
                  id="r2-access-key"
                  type="password"
                  value={r2Config.accessKeyId}
                  onChange={(e) => updateR2Config({ accessKeyId: e.target.value })}
                  placeholder="Access Key ID"
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r2-secret-key" className={cn(
                  "text-sm font-medium",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>Secret Access Key</Label>
                <Input
                  id="r2-secret-key"
                  type="password"
                  value={r2Config.secretAccessKey}
                  onChange={(e) => updateR2Config({ secretAccessKey: e.target.value })}
                  placeholder="Secret Access Key"
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
                <Label htmlFor="turso-url" className={cn(
                  "text-sm font-medium",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>Database URL</Label>
                <Input
                  id="turso-url"
                  value={tursoConfig.url}
                  onChange={(e) => updateTursoConfig({ url: e.target.value })}
                  placeholder="libsql://your-db.turso.io"
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="turso-token" className={cn(
                  "text-sm font-medium",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>Auth Token</Label>
                <Input
                  id="turso-token"
                  type="password"
                  value={tursoConfig.token}
                  onChange={(e) => updateTursoConfig({ token: e.target.value })}
                  placeholder="Auth Token"
                  className={cn(
                    "border-gray-700",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}
                />
              </div>
            </div>
          </div>

          <Alert className={cn(
            "border-none",
            notesTheme === 'light' ? 'bg-main' : 'bg-white'
          )}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className={cn(
              "text-sm",
              notesTheme === 'light' ? 'text-white' : 'text-black'
            )}>
              <strong>Note:</strong> Your credentials are stored locally in your browser. 
              Make sure to keep them secure and don't share them with others.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
