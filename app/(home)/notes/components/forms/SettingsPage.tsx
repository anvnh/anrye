'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2Icon, LogOut, User, RefreshCw } from 'lucide-react';
import { StorageSwitcher } from './StorageSwitcher';
import { useStorageSettings } from '../../hooks/settings/useStorageSettings';
import { useDrive } from '../../../../lib/driveContext';
import { driveService } from '../../services/googleDrive';
import { cn } from '@/lib/utils';
import NotificationSettings from '../../../../components/NotificationSettings';

interface SettingsPageProps {
  notesTheme: 'light' | 'dark';
  setNotesTheme: (t: 'light' | 'dark') => void;
  // font settings (provided by parent)
  fontFamily: string;
  setFontFamily: (v: string) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  previewFontSize: string;
  setPreviewFontSize: (v: string) => void;
  codeBlockFontSize: string;
  setCodeBlockFontSize: (v: string) => void;
  // theme/highlighter state (provided by parent)
  currentTheme: string;
  setCurrentTheme: (v: string) => void;
  themeOptions: { value: string; label: string }[];
  // editor behavior
  tabSize: number;
  setTabSize: (v: number) => void;
}

export function SettingsPage({
  notesTheme,
  setNotesTheme,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  previewFontSize,
  setPreviewFontSize,
  codeBlockFontSize,
  setCodeBlockFontSize,
  currentTheme,
  setCurrentTheme,
  themeOptions,
  tabSize,
  setTabSize,
}: SettingsPageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [driveUserInfo, setDriveUserInfo] = useState<{ name: string; email: string; picture: string } | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);

  const { currentProvider, storageStatus } = useStorageSettings();
  const { isSignedIn, signIn, signOut } = useDrive();

  // Load Google Drive user info when signed in
  useEffect(() => {
    const loadDriveUserInfo = async () => {
      if (currentProvider === 'google-drive' && isSignedIn) {
        setIsLoadingUserInfo(true);
        try {
          const userData = await driveService.getUserInfo();
          setDriveUserInfo(userData);
        } catch (error) {
          console.error('Failed to load Google Drive user info:', error);
          setDriveUserInfo(null);
        } finally {
          setIsLoadingUserInfo(false);
        }
      } else {
        setDriveUserInfo(null);
      }
    };

    loadDriveUserInfo();
  }, [currentProvider, isSignedIn]);

  const handleSwitchDriveAccount = async () => {
    try {
      // Clear sync flags and local caches so we load Drive data fresh for the new account
      if (typeof window !== 'undefined') {
        localStorage.removeItem('has-synced-drive');
        localStorage.removeItem('has-synced-with-drive');
        localStorage.removeItem('folders-cache');
        localStorage.removeItem('notes-cache');
        localStorage.removeItem('notes-new');
        localStorage.removeItem('folders-new');
      }
      await signOut();
      await signIn();
    } catch (error) {
      console.error('Failed to switch Drive account:', error);
    }
  };

  const handleSignInToDrive = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Failed to sign in to Google Drive:', error);
    }
  };

  const handleSignOutFromDrive = async () => {
    try {
      await signOut();
      setDriveUserInfo(null);
    } catch (error) {
      console.error('Failed to sign out from Google Drive:', error);
    }
  };

  const fontOptions = [
    { value: 'inherit', label: 'Default' },
    { value: 'monospace', label: 'Monospace' },
    { value: 'serif', label: 'Serif' },
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'Fira Code', label: 'Fira Code' },
    { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  ];

  const fontSizeOptions = [
    { value: '14px', label: '14px' },
    { value: '16px', label: '16px' },
    { value: '18px', label: '18px' },
    { value: '20px', label: '20px' },
    { value: '22px', label: '22px' },
    { value: '24px', label: '24px' },
    { value: '26px', label: '26px' },
    { value: '28px', label: '28px' },
    { value: '30px', label: '30px' },
    { value: '32px', label: '32px' },
    { value: '36px', label: '36px' },
    { value: '40px', label: '40px' },
    { value: '48px', label: '48px' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "px-3 py-1 rounded-md text-sm font-medium bg-icon-notenavbar text-white flex items-center gap-1",
            notesTheme === 'light' ? 'bg-icon-notenavbar-light' : '',
            "focus:outline-none focus:ring-0 focus:ring-offset-0"
          )}
        >
          <Settings2Icon size={17} className={`${notesTheme === 'light' ? 'text-black' : 'text-white'}`} />
          <span className={`${notesTheme === 'light' ? 'text-black/70' : 'text-white'}`}>
            Settings
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        notesTheme === 'light' ? 'bg-white' : 'bg-main',
        "max-h-[90vh] overflow-y-auto border-gray-700 !max-w-4xl w-full sm:!max-w-4xl"
      )}>
        <DialogHeader>
          <DialogTitle className={`${notesTheme === 'light' ? 'text-black' : 'text-white'}`}>
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className={cn(
            "grid w-full grid-cols-4 h-10 p-1 rounded-md",
            notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
          )}>
            <TabsTrigger value="appearance">
              Appearance & Editor
            </TabsTrigger>
            <TabsTrigger value="storage">
              Storage
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="about">
              About
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="appearance" className="space-y-6">
            {/* Theme Settings Section */}
            <div className="space-y-4">
              <h3 className={cn(
                "text-lg font-semibold",
                notesTheme === 'light' ? 'text-black' : 'text-white'
              )}>
                Theme Settings
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 flex flex-col">
                  <label className={cn(
                    "text-sm font-medium",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}>
                    Syntax Highlighting Theme
                  </label>
                  <select
                    value={currentTheme}
                    onChange={(e) => setCurrentTheme(e.target.value)}
                    className={cn(
                      "w-full p-2 rounded-md bg-secondary",
                      notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
                    )}
                  >
                    {themeOptions.map((theme: { value: string; label: string }) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3 flex flex-col">
                  <label className={cn(
                    "text-sm font-medium",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}>
                    Notes UI Theme
                  </label>
                  <select
                    value={notesTheme}
                    onChange={(e) => setNotesTheme(e.target.value as 'light' | 'dark')}
                    className={cn(
                      "w-full p-2 rounded-md bg-secondary",
                      notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
                    )}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Editor Settings Section */}
            <div className="space-y-4">
              <h3 className={cn(
                "text-lg font-semibold",
                notesTheme === 'light' ? 'text-black' : 'text-white'
              )}>
                Editor Settings
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 flex flex-col">
                  <label className={cn(
                    "text-sm font-medium",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}>
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={cn(
                      "w-full p-2 rounded-md bg-secondary",
                      notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
                    )}
                  >
                    {fontOptions.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3 flex flex-col">
                  <label className={cn(
                    "text-sm font-medium",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}>
                    Editor Font Size
                  </label>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className={cn(
                      "w-full p-2 rounded-md bg-secondary",
                      notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
                    )}
                  >
                    {fontSizeOptions.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3 flex flex-col">
                  <label className={cn(
                    "text-sm font-medium",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}>
                    Preview Font Size
                  </label>
                  <select
                    value={previewFontSize}
                    onChange={(e) => setPreviewFontSize(e.target.value)}
                    className={cn(
                      "w-full p-2 rounded-md bg-secondary",
                      notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
                    )}
                  >
                    {fontSizeOptions.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3 flex flex-col">
                  <label className={cn(
                    "text-sm font-medium",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}>
                    Code Block Font Size
                  </label>
                  <select
                    value={codeBlockFontSize}
                    onChange={(e) => setCodeBlockFontSize(e.target.value)}
                    className={cn(
                      "w-full p-2 rounded-md bg-secondary",
                      notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
                    )}
                  >
                    {fontSizeOptions.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3 flex flex-col">
                  <label className={cn(
                    "text-sm font-medium",
                    notesTheme === 'light' ? 'text-black' : 'text-white'
                  )}>
                    Tab Size
                  </label>
                  <select
                    value={tabSize}
                    onChange={(e) => setTabSize(Number(e.target.value))}
                    className={cn(
                      "w-full p-2 rounded-md bg-secondary",
                      notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
                    )}
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                    <option value={8}>8</option>
                  </select>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="storage" className="space-y-6">
            <StorageSwitcher />
            
            {/* Google Drive Account Management */}
            {currentProvider === 'google-drive' && (
              <div className="space-y-4">
                <h3 className={cn(
                  "text-lg font-semibold",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>
                  Google Drive Account
                </h3>
                
                <div className={cn(
                  "p-4 rounded-lg border",
                  notesTheme === 'light' ? 'bg-white border-gray-200' : 'bg-secondary border-gray-700'
                )}>
                  {isSignedIn ? (
                    <div className="space-y-4">
                      {/* Current Account Info */}
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {driveUserInfo?.picture ? (
                            <img
                              src={driveUserInfo.picture}
                              alt="Profile"
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          {isLoadingUserInfo ? (
                            <div className="flex items-center space-x-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span className={cn(
                                "text-sm",
                                notesTheme === 'light' ? 'text-gray-600' : 'text-gray-300'
                              )}>
                                Loading account info...
                              </span>
                            </div>
                          ) : driveUserInfo ? (
                            <div>
                              <p className={cn(
                                "font-medium",
                                notesTheme === 'light' ? 'text-black' : 'text-white'
                              )}>
                                {driveUserInfo.name}
                              </p>
                              <p className={cn(
                                "text-sm",
                                notesTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                              )}>
                                {driveUserInfo.email}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className={cn(
                                "font-medium",
                                notesTheme === 'light' ? 'text-black' : 'text-white'
                              )}>
                                Signed in to Google Drive
                              </p>
                              <p className={cn(
                                "text-sm",
                                notesTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                              )}>
                                Account information unavailable
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Account Actions */}
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleSwitchDriveAccount}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Switch Account</span>
                        </Button>
                        <Button
                          onClick={handleSignOutFromDrive}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Disconnect</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className={cn(
                          "font-medium mb-2",
                          notesTheme === 'light' ? 'text-black' : 'text-white'
                        )}>
                          Not signed in to Google Drive
                        </p>
                        <p className={cn(
                          "text-sm mb-4",
                          notesTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                        )}>
                          Sign in to sync your notes with Google Drive
                        </p>
                        <Button
                          onClick={handleSignInToDrive}
                          className="flex items-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>Sign in to Google Drive</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>
          
          <TabsContent value="about" className="space-y-6">
            <div className="space-y-4">
              <h3 className={cn(
                "text-lg font-semibold",
                notesTheme === 'light' ? 'text-black' : 'text-white'
              )}>
                About
              </h3>
              
              <div className="space-y-3 flex flex-col">
                <p className={cn(
                  "text-sm text-muted-foreground",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>
                  <strong>Current Storage:</strong> {storageStatus.currentProvider === 'google-drive' ? 'Google Drive' : 'R2 + Turso'}
                </p>
                <p className={cn(
                  "text-sm text-muted-foreground",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>
                  <strong>Status:</strong> {storageStatus.isConnected ? 'Connected' : 'Disconnected'}
                </p>
                <p className={cn(
                  "text-sm text-muted-foreground",
                  notesTheme === 'light' ? 'text-black' : 'text-white'
                )}>
                  <strong>Version:</strong> 1.0.0
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
