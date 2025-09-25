'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2Icon } from 'lucide-react';
import { StorageSwitcher } from './StorageSwitcher';
import { useStorageSettings } from '../../hooks/settings/useStorageSettings';
import { cn } from '@/lib/utils';

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

  const { currentProvider, storageStatus } = useStorageSettings();

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
            "grid w-full grid-cols-3 h-10 p-1 rounded-md",
            notesTheme === 'light' ? 'bg-white' : 'bg-secondary'
          )}>
            <TabsTrigger value="appearance">
              Appearance & Editor
            </TabsTrigger>
            <TabsTrigger value="storage">
              Storage
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
