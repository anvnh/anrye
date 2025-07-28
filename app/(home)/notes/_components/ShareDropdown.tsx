'use client';

import { useState, useEffect } from 'react';
import { Share, Copy, Eye, Edit3, Lock, Globe, User, CheckCircle2Icon, ChevronDownIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { format, parse } from 'date-fns';

interface ShareDropdownProps {
  noteId: string;
  noteTitle: string;
  noteContent: string;
}

interface ShareSettings {
  sharingUrl: string;
  editMode: 'edit' | 'view';
  readPermission: 'public' | 'password-required';
  writePermission: 'only-me' | 'password-required';
  readPassword?: string;
  writePassword?: string;
  expireAt?: string | null;
  selectedTime: string;
}

export function ShareDropdown({ noteId, noteTitle, noteContent }: ShareDropdownProps) {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    sharingUrl: '',
    editMode: 'edit',
    readPermission: 'public',
    writePermission: 'only-me',
    readPassword: '',
    writePassword: '',
    expireAt: null,
    selectedTime: '00:00:00'
  });

  const [copied, setCopied] = useState(false);
  const [shortId, setShortId] = useState<string>('');

  const [showAlert, setShowAlert] = useState(false);

  // Initialize sharing URL on component mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if this note already has a shared link
      const existingSharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      let existingShortId = '';
      let existingSettings = null;

      // Find if this note is already shared
      for (const [id, sharedNote] of Object.entries(existingSharedNotes)) {
        if ((sharedNote as any).note.id === noteId) {
          existingShortId = id;
          existingSettings = (sharedNote as any).settings;
          break;
        }
      }

      // Use existing shortId or create new one
      const finalShortId = existingShortId || generateShortId();
      setShortId(finalShortId);

      // Load existing settings or use defaults
      if (existingSettings) {
        setShareSettings(prev => ({
          ...prev,
          sharingUrl: `${window.location.origin}/shared/${finalShortId}`,
          editMode: existingSettings.editMode || 'edit',
          readPermission: existingSettings.readPermission || 'public',
          writePermission: existingSettings.writePermission || 'only-me',
          readPassword: existingSettings.readPassword || '',
          writePassword: existingSettings.writePassword || '',
          expireAt: existingSettings.expireAt || null
        }));
      } else {
        setShareSettings(prev => ({
          ...prev,
          sharingUrl: `${window.location.origin}/shared/${finalShortId}`,
          expireAt: null
        }));
      }
    }
  }, [noteId, noteTitle, noteContent]); // Add dependencies to re-run when note changes

  function generateShortId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  function generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  const saveSharedNote = async (shortIdToUse: string) => {
    try {
      // Create note object with current data
      const noteToShare = {
        id: noteId,
        title: noteTitle,
        content: noteContent,
        lastModified: new Date().toISOString(),
        path: '',
        folderId: ''
      };

      // Get current settings
      const currentSettings = {
        editMode: shareSettings.editMode,
        readPermission: shareSettings.readPermission,
        writePermission: shareSettings.writePermission,
        readPassword: shareSettings.readPassword,
        writePassword: shareSettings.writePassword,
        expireAt: shareSettings.expireAt
      };

      // Save to server via API
      const response = await fetch('/api/shared-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortId: shortIdToUse,
          note: noteToShare,
          settings: currentSettings
        })
      });

      if (response.ok) {
        console.log('Saved shared note to server:', shortIdToUse);
      } else {
        console.error('Failed to save shared note to server');
      }

      // Also keep localStorage as backup for now
      // const sharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      // sharedNotes[shortIdToUse] = {
      //   note: noteToShare,
      //   settings: currentSettings,
      //   createdAt: new Date().toISOString()
      // };
      // localStorage.setItem('sharedNotes', JSON.stringify(sharedNotes));

    } catch (err) {
      console.error('Error saving shared note:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareSettings.sharingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
      }, 5000);

      // Save the shared note to db
      await saveSharedNote(shortId);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const updateShareSettings = (key: keyof ShareSettings, value: any) => {
    setShareSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: value
      };

      // Generate password when switching to password-required
      if (key === 'readPermission' && value === 'password-required' && !prev.readPassword) {
        const newPassword = generatePassword();
        newSettings.readPassword = newPassword;
      }
      if (key === 'writePermission' && value === 'password-required' && !prev.writePassword) {
        const newPassword = generatePassword();
        newSettings.writePassword = newPassword;
      }

      // Update expireAt when date or time changes
      if (key === 'expireAt' && value) {
        let time = newSettings.selectedTime || format(new Date(), 'HH:mm:ss');
        let datePart = value.split('T')[0];
        newSettings.expireAt = `${datePart}T${time}`;
      }
      if (key === 'selectedTime' && newSettings.expireAt) {
        let datePart = newSettings.expireAt.split('T')[0];
        newSettings.expireAt = `${datePart}T${value}`;
      }

      return newSettings;
    });
  };

  const updateSharedNoteSettings = async (shortIdToUpdate: string, settingsToSave: ShareSettings) => {
    try {
      // Update on server
      const noteToShare = {
        id: noteId,
        title: noteTitle,
        content: noteContent,
        lastModified: new Date().toISOString(),
        path: '',
        folderId: ''
      };

      await fetch('/api/shared-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortId: shortIdToUpdate,
          note: noteToShare,
          settings: {
            editMode: settingsToSave.editMode,
            readPermission: settingsToSave.readPermission,
            writePermission: settingsToSave.writePermission,
            readPassword: settingsToSave.readPassword,
            writePassword: settingsToSave.writePassword
          }
        })
      });

      // Also update localStorage as backup
      const sharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      if (sharedNotes[shortIdToUpdate]) {
        sharedNotes[shortIdToUpdate].settings = {
          editMode: settingsToSave.editMode,
          readPermission: settingsToSave.readPermission,
          writePermission: settingsToSave.writePermission,
          readPassword: settingsToSave.readPassword,
          writePassword: settingsToSave.writePassword
        };
        sharedNotes[shortIdToUpdate].note = noteToShare;
        localStorage.setItem('sharedNotes', JSON.stringify(sharedNotes));
      }

      console.log('Updated shared note settings:', shortIdToUpdate, settingsToSave);
    } catch (err) {
      console.error('Error updating shared note settings:', err);
    }
  };

  const getShortUrl = () => {
    return shortId;
  };

  const handleOpenMenu = () => {
    const newShortId = generateShortId();
    setShortId(newShortId);
    setShareSettings(prev => {
      let newSettings = {
        ...prev,
        sharingUrl: `${window.location.origin}/shared/${newShortId}`
      };
      let changed = false;
      if (prev.readPermission === 'password-required') {
        newSettings.readPassword = generatePassword();
        changed = true;
      }
      if (prev.writePermission === 'password-required') {
        newSettings.writePassword = generatePassword();
        changed = true;
      }
      return newSettings;
    });
  };

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <>
      {showAlert && (
        <Alert variant="default" className="alert-custom fixed bottom-4 right-4 z-50 w-80">
          <CheckCircle2Icon className="h-5 w-5" />
          <AlertTitle>Link copied!</AlertTitle>
          <AlertDescription>
            The sharing link has been copied to your clipboard.
          </AlertDescription>
        </Alert>
      )}
      <DropdownMenu
        onOpenChange={handleOpenMenu}
      >
        <DropdownMenuTrigger asChild>
          <button
            className="px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-gray-600 text-white hover:bg-gray-700"
            title="Share Note"
          >
            <Share size={16} />
            <span
              className="hidden sm:inline"
            >
              Share
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-80 bg-secondary text-white border-gray-700"
          align="end"
        >

          <div className="px-3 py-3">
            <DropdownMenuLabel className="text-sm text-gray-300 px-0 mb-2 flex items-center gap-2">
              <h3 className="text-sm text-gray-300 px-0">
                Share settings
              </h3>
            </DropdownMenuLabel>

            <div className="flex flex-col gap-2">
              <select
                value={shareSettings.expireAt === null ? 'forever' : 'custom'}
                onChange={e => {
                  if (e.target.value === 'forever') {
                    updateShareSettings('expireAt', null);
                  } else {
                    const d = new Date();
                    d.setDate(d.getDate()); // Default is today
                    updateShareSettings('expireAt', d.toISOString().slice(0, 16));
                  }
                }}
                className="px-2 py-1 rounded bg-secondary text-white text-[15px] border-none outline-none mb-2"
              >
                <option value="forever">Forever</option>
                <option value="custom">Choose date/time</option>
              </select>
              {/* {shareSettings.expireAt !== null && (
                <input
                  type="datetime-local"
                  value={shareSettings.expireAt?.slice(0, 16) || ''}
                  onChange={e => updateShareSettings('expireAt', e.target.value)}
                  className="px-2 py-1 rounded bg-gray-700 text-white text-xs border-none outline-none"
                  min={new Date().toISOString().slice(0, 16)}
                />
              )} */}

              {shareSettings.expireAt !== null && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Label htmlFor="date-picker" className="px-1 text-gray-300">
                      Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild className='h-[26px]'>
                        <Button
                          variant="outline"
                          id="date-picker"
                          className="w-auto justify-between font-normal bg-secondary text-white border-gray-600 hover:bg-gray-600 hover:text-white"
                        >
                          {shareSettings.expireAt
                            ? format(new Date(shareSettings.expireAt), 'PPP')
                            : format(new Date(), 'PPP')}
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0 bg-secondary text-white border-gray-600" align="start">
                        <Calendar
                          mode="single"
                          selected={shareSettings.expireAt
                            ? new Date(shareSettings.expireAt)
                            : new Date()}
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            updateShareSettings(
                              'expireAt',
                              date ? format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS'+00:00'") : null
                            );
                          }}
                          className="rounded-lg border-gray-600"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                    <div className="flex gap-3">
                    <Label htmlFor="time-picker" className="px-1 text-gray-300">
                      Time
                    </Label>
                    <Input
                      type="time"
                      id="time-picker"
                      step="1"
                      value={
                        shareSettings.selectedTime ||
                        format(new Date(), 'HH:mm:ss')
                      }
                      onChange={e => updateShareSettings('selectedTime', e.target.value)}
                      className="h-[26px] bg-secondary text-white border-gray-600 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    </div>
                </div>
              )}

            </div>
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Note Permission Section */}
          <div className="px-3 py-3">
            <DropdownMenuLabel className="text-sm text-gray-300 px-0 flex items-center gap-2 mb-3">
              <Lock size={16} />
              Note Permission
            </DropdownMenuLabel>

            {/* Read Permissions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Read</span>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input
                    type="radio"
                    name="readPermission"
                    value="public"
                    checked={shareSettings.readPermission === 'public'}
                    onChange={(e) => updateShareSettings('readPermission', e.target.value)}
                    className="text-blue-600"
                  />
                  <Globe size={14} />
                  <span>
                    Public
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input
                    type="radio"
                    name="readPermission"
                    value="password-required"
                    checked={shareSettings.readPermission === 'password-required'}
                    onChange={(e) => updateShareSettings('readPermission', e.target.value)}
                    className="text-blue-600"
                  />
                  <User size={14} />
                  <span>
                    Required password
                  </span>
                </label>
              </div>

              {/* Show password when password-required is selected */}
              {shareSettings.readPermission === 'password-required' && shareSettings.readPassword && (
                <div className="mt-2 p-2 bg-gray-600 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">
                      Password:
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-white font-mono">{shareSettings.readPassword}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(shareSettings.readPassword || '')}
                        className="text-blue-400 hover:text-blue-300"
                        title="Copy password"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Write Permissions */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">
                  Write
                </span>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input
                    type="radio"
                    name="writePermission"
                    value="only-me"
                    checked={shareSettings.writePermission === 'only-me'}
                    onChange={(e) => updateShareSettings('writePermission', e.target.value)}
                    className="text-blue-600"
                  />
                  <Lock size={14} />
                  <span>
                    Only me
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input
                    type="radio"
                    name="writePermission"
                    value="password-required"
                    checked={shareSettings.writePermission === 'password-required'}
                    onChange={(e) => updateShareSettings('writePermission', e.target.value)}
                    className="text-blue-600"
                  />
                  <User size={14} />
                  <span>Required password</span>
                </label>
              </div>

              {/* Show password when password-required is selected */}
              {shareSettings.writePermission === 'password-required' && shareSettings.writePassword && (
                <div className="mt-2 p-2 bg-gray-600 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Password:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-300 font-mono">{shareSettings.writePassword}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(shareSettings.writePassword || '')}
                        className="text-blue-400 hover:text-blue-300"
                        title="Copy password"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Sharing URL Section */}
          <div className="px-3 py-3">
            <DropdownMenuLabel className="text-sm text-gray-300 px-0 mb-2">
              Sharing URL
            </DropdownMenuLabel>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center bg-gray-700 rounded">
                <span className="px-3 py-2 text-xs text-gray-400 bg-gray-600 rounded-l border-r border-gray-500">
                  {getShortUrl()}
                </span>
                {/* <select
                  value={shareSettings.editMode}
                  onChange={(e) => updateShareSettings('editMode', e.target.value)}
                  className="w-full items-center px-2 py-2 text-xs bg-gray-700 text-white border-none outline-none"
                >
                  <option value="edit">/edit</option>
                  <option value="view">/view</option>
                </select> */}
                <span className='text-[13px] px-3 font-light text-gray-400'>
                  /view
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 text-xs rounded transition-colors ${copied
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Copy Share Link Button */}
          <div className="p-3">
            <button
              onClick={handleCopyLink}
              className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              <Copy size={16} />
              {copied ? 'Link Copied!' : 'Copy share link'}
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
