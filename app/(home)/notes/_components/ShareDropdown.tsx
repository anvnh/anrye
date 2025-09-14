'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share, Copy, Eye, Lock, Globe, User, CheckCircle2Icon, ChevronDownIcon, Trash2, Edit3, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { TimePicker } from './TimePicker';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

import { format, parse, isAfter, isBefore } from 'date-fns';

interface ShareDropdownProps {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  notesTheme?: 'light' | 'dark';
}

interface ShareSettings {
  sharingUrl: string;
  readPermission: 'public' | 'password-required';
  readPassword?: string;
  expireAt?: string | null;
  selectedTime: string;
}

interface SharedNote {
  shortId: string;
  settings: {
    readPermission: 'public' | 'password-required';
    readPassword?: string;
    expireAt?: string | null;
  };
  createdAt: string;
  expireAt: string | null;
}

export function ShareDropdown({ noteId, noteTitle, noteContent, notesTheme }: ShareDropdownProps) {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    sharingUrl: '',
    readPermission: 'public',
    readPassword: '',
    expireAt: null,
    selectedTime: '00:00:00'
  });

  const [copied, setCopied] = useState(false);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);
  const [shortId, setShortId] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);

  // Shared notes management state
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [loadingSharedNotes, setLoadingSharedNotes] = useState(false);
  const [editingNote, setEditingNote] = useState<SharedNote | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingNote, setDeletingNote] = useState<SharedNote | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  // Track when the native time picker is being interacted with
  const [isTimePicking, setIsTimePicking] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    readPermission: 'public' as 'public' | 'password-required',
    readPassword: '',
    expireAt: null as string | null,
    selectedTime: '00:00:00'
  });

  // Initialize sharing URL on component mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const draftKey = `shareDraft_${noteId}`;
      // Check if this note already has a shared link
      const existingSharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      let existingShortId = '';
      let existingSettings: { readPermission: 'public' | 'password-required'; readPassword?: string; expireAt?: string | null } | null = null;

      // Find if this note is already shared
      for (const [id, sharedNote] of Object.entries(existingSharedNotes)) {
        if ((sharedNote as any).note.id === noteId) {
          existingShortId = id;
          existingSettings = (sharedNote as any).settings;
          break;
        }
      }

      // Only use existing shortId, don't create new one automatically
      if (existingShortId) {
        setShortId(existingShortId);
        setShareSettings(prev => ({
          ...prev,
          sharingUrl: `${window.location.origin}/shared/${existingShortId}`,
          readPermission: existingSettings?.readPermission || 'public',
          readPassword: existingSettings?.readPassword || '',
          expireAt: existingSettings?.expireAt || null
        }));
        // Clear any draft once a real share exists
        localStorage.removeItem(draftKey);
      } else {
        // If no existing shared link, reuse a draft shortId (persisted across reloads)
        const draftShortId = localStorage.getItem(draftKey);
        const placeholderShortId = draftShortId || generateShortId();
        setShortId(placeholderShortId);
        setShareSettings(prev => ({
          ...prev,
          sharingUrl: `${window.location.origin}/shared/${placeholderShortId}`,
          expireAt: null
        }));
        // Persist the draft so it stays stable across refreshes
        localStorage.setItem(draftKey, placeholderShortId);
      }
    }
  }, [noteId, noteTitle, noteContent]); // Add dependencies to re-run when note changes

  // Fetch existing shared notes
  useEffect(() => {
    fetchSharedNotes();
  }, [noteId]);

  const fetchSharedNotes = async () => {
    try {
      setLoadingSharedNotes(true);
      // Include title as fallback identifier in case note IDs differ across devices
      const params = new URLSearchParams({ noteId });
      if (noteTitle) params.set('title', noteTitle);
      const response = await fetch(`/api/shared-notes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSharedNotes(data.sharedNotes || []);
      } else {
        console.error('Failed to fetch shared notes:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching shared notes:', error);
    } finally {
      setLoadingSharedNotes(false);
    }
  };

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
        readPermission: shareSettings.readPermission,
        readPassword: shareSettings.readPassword,
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
        // Refresh shared notes list
        await fetchSharedNotes();
      } else {
        console.error('Failed to save shared note to server');
      }

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
      // Clear draft once saved to server
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`shareDraft_${noteId}`);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleCopyExistingLink = async (shortId: string) => {
    try {
      const link = `${window.location.origin}/shared/${shortId}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(shortId);
      setShowAlert(true);
      setTimeout(() => {
        setCopiedLink(null);
        setShowAlert(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleCopyPassword = async (password: string, noteId: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPasswordId(noteId);
      setTimeout(() => setCopiedPasswordId(null), 2000);
    } catch (err) {
      console.error('Failed to copy password to clipboard:', err);
    }
  };

  const handleEditNote = (note: SharedNote) => {
    setEditingNote(note);
    setEditForm({
      readPermission: note.settings.readPermission,
      readPassword: note.settings.readPassword || '',
      expireAt: note.expireAt || null,
      selectedTime: note.expireAt ? format(new Date(note.expireAt), 'HH:mm:ss') : '00:00:00'
    });
    setShowEditDialog(true);
  };

  const handleDeleteNote = (note: SharedNote) => {
    setDeletingNote(note);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingNote) return;

    try {
      const response = await fetch(`/api/shared-notes?id=${deletingNote.shortId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchSharedNotes();
        setShowDeleteDialog(false);
        setDeletingNote(null);
      }
    } catch (error) {
      console.error('Error deleting shared note:', error);
    }
  };

  const saveEdit = async () => {
    if (!editingNote) return;

    try {
      const settings = {
        readPermission: editForm.readPermission,
        readPassword: editForm.readPassword,
        expireAt: editForm.expireAt
      };

      const response = await fetch('/api/shared-notes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortId: editingNote.shortId,
          settings
        })
      });

      if (response.ok) {
        await fetchSharedNotes();
        setShowEditDialog(false);
        setEditingNote(null);
      }
    } catch (error) {
      console.error('Error updating shared note:', error);
    }
  };

  const updateEditForm = (key: string, value: any) => {
    setEditForm(prev => {
      const newForm = { ...prev, [key]: value };

      // Handle expireAt updates
      if (key === 'expireAt' && value) {
        const time = newForm.selectedTime || format(new Date(), 'HH:mm:ss');
        const datePart = value.split('T')[0];
        newForm.expireAt = `${datePart}T${time}`;
      }
      if (key === 'selectedTime' && newForm.expireAt) {
        const datePart = newForm.expireAt.split('T')[0];
        newForm.expireAt = `${datePart}T${value}`;
      }

      return newForm;
    });
  };

  const isExpired = (expireAt: string | null) => {
    if (!expireAt) return false;
    return isBefore(new Date(expireAt), new Date());
  };

  const isExpiringSoon = (expireAt: string | null) => {
    if (!expireAt) return false;
    const now = new Date();
    const expireDate = new Date(expireAt);
    const diffInHours = (expireDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffInHours > 0 && diffInHours <= 24;
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

      // Update expireAt when date or time changes
      if (key === 'expireAt' && value) {
        const time = newSettings.selectedTime || format(new Date(), 'HH:mm:ss');
        const datePart = value.split('T')[0];
        newSettings.expireAt = `${datePart}T${time}`;
      }
      if (key === 'selectedTime' && newSettings.expireAt) {
        const datePart = newSettings.expireAt.split('T')[0];
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
            readPermission: settingsToSave.readPermission,
            readPassword: settingsToSave.readPassword
          }
        })
      });

      // Also update localStorage as backup
      const sharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      if (sharedNotes[shortIdToUpdate]) {
        sharedNotes[shortIdToUpdate].settings = {
          readPermission: settingsToSave.readPermission,
          readPassword: settingsToSave.readPassword
        };
        sharedNotes[shortIdToUpdate].note = noteToShare;
        localStorage.setItem('sharedNotes', JSON.stringify(sharedNotes));
      }


    } catch (err) {
      console.error('Error updating shared note settings:', err);
    }
  };

  const getShortUrl = () => {
    return shortId;
  };

  const handleChangeLink = () => {
    const newShortId = generateShortId();
    setShortId(newShortId);
    setShareSettings(prev => {
      const newSettings = {
        ...prev,
        sharingUrl: `${window.location.origin}/shared/${newShortId}`
      };
      if (prev.readPermission === 'password-required') {
        newSettings.readPassword = generatePassword();
      }
      return newSettings;
    });
    // Persist the new draft so the UI remains stable across refreshes
    if (typeof window !== 'undefined') {
      localStorage.setItem(`shareDraft_${noteId}`, newShortId);
    }
  };

  const handleOpenMenu = () => {
    // Don't change the URL automatically when opening the dropdown
    // Only refresh the shared notes list
    fetchSharedNotes();
  };

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined)

  return (
    <>
      <DropdownMenu onOpenChange={handleOpenMenu}>
        <DropdownMenuTrigger asChild>
          <button
            className={`px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 text-white bg-icon-notenavbar
              ${notesTheme === 'light' ? 'bg-icon-notenavbar-light' : ''}`}
            title="Share Note"
          >
            <Share size={14} className={`${notesTheme === 'light' ? 'text-black' : 'text-white'}`} />
            <span className={`${notesTheme === 'light' ? 'text-black/70' : 'text-white'}`}>Share</span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className={`
            w-[320px] bg-dropdown-navbar text-white border-gray-700 
            max-h-[75vh] overflow-y-auto ${notesTheme === 'light' ? 'share-dropdown-light' : ''}
          `}
          align="end"
          // Keep menu open when interacting with nested popovers (calendar)
          // or the native time picker overlay
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement | null;
            // If we're in the middle of choosing time, don't close
            if (isTimePicking) {
              e.preventDefault();
              return;
            }
            // If interacting with any shadcn/radix Popover content (calendar), don't close
            if (target && target.closest('[data-slot="popover-content"]')) {
              e.preventDefault();
            }
          }}
          onCloseAutoFocus={(e) => {
            // Prevent focus jank that can close the menu after clicking buttons
            e.preventDefault();
          }}
        >


          {/* Existing Shared Links Section */}
          {loadingSharedNotes ? (
            <div className="px-3 py-3">
              <div className="text-sm text-gray-300 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
                Loading shared links...
              </div>
            </div>
          ) : sharedNotes.length > 0 ? (
            <>
              <div className="px-3 py-3">
                <DropdownMenuLabel
                  className={`text-sm text-gray-300 px-0 mb-3 flex items-center gap-2 ${notesTheme === 'light' ? 'text-black/90' : ''}`}
                >
                  <Share className="h-4 w-4" />
                  <span>Existing Shared Links ({sharedNotes.length})</span>
                </DropdownMenuLabel>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sharedNotes.map((note) => (
                    <div key={note.shortId} className={`bg-main/90 backdrop-blur-md rounded p-3 border border-gray-400/50`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-mono ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'} bg-transparent px-2 py-1 rounded`}>
                              {note.shortId}
                            </span>
                            {isExpired(note.expireAt || null) && (
                              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Expired
                              </span>
                            )}
                            {isExpiringSoon(note.expireAt || null) && !isExpired(note.expireAt || null) && (
                              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Soon
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-300">
                            <div className="flex items-center gap-1">
                              {note.settings.readPermission === 'public' ? (
                                <>
                                  <Globe className={`h-3 w-3 ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`} />
                                  <span className={`${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>
                                    Public
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Lock className={`h-3 w-3 ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`} />
                                  <span className={`${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>
                                    Protected
                                  </span>
                                </>
                              )}
                            </div>

                            {note.expireAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(note.expireAt), 'MMM dd, HH:mm')}</span>
                              </div>
                            )}

                            {!note.expireAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className={`h-3 w-3 ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`} />
                                <span className={`${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>Never</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyExistingLink(note.shortId)}
                            className={`p-1.5 text-xs rounded ${notesTheme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-gray-600'} transition-colors`}
                            title="Copy link"
                          >
                            <Copy className={`h-3 w-3 ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`} />
                          </button>
                          <button
                            onClick={() => handleEditNote(note)}
                            className={`p-1.5 text-xs rounded ${notesTheme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-gray-600'} transition-colors`}
                            title="Edit"
                            disabled={isExpired(note.expireAt || null)}
                          >
                            <Edit3 className={`h-3 w-3 ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note)}
                            className={`p-1.5 text-xs rounded ${notesTheme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-gray-600'} text-red-500 hover:text-red-300 transition-colors`}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {note.settings.readPermission === 'password-required' && note.settings.readPassword && (
                        <div className="mt-2 p-2 bg-gray-700 rounded text-xs border border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Password:</span>
                            <div className="flex items-center gap-2">
                              <code className="text-white font-mono text-xs bg-gray-800 px-2 py-1 rounded">{note.settings.readPassword}</code>
                              <button
                                onClick={() => handleCopyPassword(note.settings.readPassword || '', note.shortId)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Copy password"
                              >
                                <Copy className="h-3 w-3" />
                                {copiedPasswordId === note.shortId && (
                                  <span className="ml-1 text-xs text-green-400">Copied</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DropdownMenuSeparator className="bg-gray-700" />
            </>
          ) : (
            <div className="px-3 py-3">
              <div className="text-sm text-gray-300 flex items-center gap-2">
                <Share className="h-4 w-4 text-gray-400" />
                No shared links found for this note.
              </div>
            </div>
          )}

          {/* Create New Share Section */}
          <div className="px-3 py-3">
            <DropdownMenuLabel
              className="text-sm px-0 mb-2 flex items-center gap-2"
            >
              <h3 className={`text-sm px-0 ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>
                Create New Share
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
                className={`px-2 py-1 rounded bg-main/90 backdrop-blur-md text-[15px] border-none outline-none mb-2 ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}
              >
                <option value="forever" className={`${notesTheme === 'light' ? 'text-black/90 bg-white' : 'text-gray-300 bg-secondary'}`}>Forever</option>
                <option value="custom" className={`${notesTheme === 'light' ? 'text-black/90 bg-white' : 'text-gray-300 bg-secondary'}`}>Choose date/time</option>
              </select>

              {shareSettings.expireAt !== null && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Popover>
                      <PopoverTrigger asChild className='h-[36px]'>
                        <Button
                          variant="outline"
                          id="date-picker"
                          className={`w-auto justify-between font-normal bg-secondary text-white border-none ${notesTheme === 'light' ? 'bg-transparent text-black' : 'bg-transparent text-white hover:bg-transparent hover:text-white'}`}
                        >
                          {shareSettings.expireAt
                            ? format(new Date(shareSettings.expireAt), 'PPP')
                            : format(new Date(), 'PPP')}
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className={`w-auto overflow-hidden p-0 bg-secondary text-white border-gray-600 ${notesTheme === 'light' ? 'share-dropdown-light' : ''}`} align="start">
                        <CalendarComponent
                          mode="single"
                          selected={shareSettings.expireAt
                            ? new Date(shareSettings.expireAt)
                            : new Date()}
                          captionLayout="dropdown"
                          // Ensure dropdowns are enabled and populated
                          fromYear={2000}
                          toYear={2100}
                          // Open at the selected month by default
                          defaultMonth={shareSettings.expireAt
                            ? new Date(shareSettings.expireAt)
                            : new Date()}
                          onSelect={(date) => {
                            updateShareSettings(
                              'expireAt',
                              date ? format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS'+00:00'") : null
                            );
                          }}
                          className="rounded-lg border-gray-600 text-white [&_.rdp-button]:text-white [&_.rdp-button]:hover:bg-gray-700 [&_.rdp-button]:hover:text-white [&_.rdp-caption]:text-white [&_.rdp-weekday]:text-gray-300 [&_.rdp-day]:text-white [&_.rdp-day_button]:text-white [&_.rdp-day_button]:hover:bg-gray-700 [&_.rdp-day_button]:hover:text-white [&_.rdp-day_button[data-selected=true]]:bg-blue-600 [&_.rdp-day_button[data-selected=true]]:text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div
                    onFocusCapture={() => setIsTimePicking(true)}
                    onBlurCapture={() => setTimeout(() => setIsTimePicking(false), 0)}
                  >
                    <TimePicker
                      value={
                        shareSettings.selectedTime ||
                        format(new Date(), 'HH:mm:ss')
                      }
                      onChange={(value) => updateShareSettings('selectedTime', value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Note Permission Section */}
          <div className="px-3 py-3">
            <DropdownMenuLabel className={`text-sm  ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'} px-0 flex items-center gap-2 mb-3`}>
              <Lock size={16} />
              Note Permission
            </DropdownMenuLabel>

            {/* Read Permissions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>
                  Read
                </span>
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
                  <Globe size={14} className={`${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`} />
                  <span className={`${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>
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
                  <User size={14} className={`${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`} />
                  <span className={`${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>
                    Password Required
                  </span>
                </label>
              </div>

              {/* Show password when password-required is selected */}
              {shareSettings.readPermission === 'password-required' && shareSettings.readPassword && (
                <div className="mt-2 p-2 bg-transparent rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-bold text-md">
                      Password:
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-white font-mono">{shareSettings.readPassword}</code>
                      <button
                        onClick={() => handleCopyPassword(shareSettings.readPassword || '', 'new-share')}
                        className="text-blue-400 hover:text-blue-300"
                        title="Copy password"
                      >
                        <Copy size={12} />
                        {copiedPasswordId === 'new-share' && (
                          <span className="ml-1 text-xs text-green-400">Copied</span>
                        )}
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
            <DropdownMenuLabel className={`text-sm ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'} px-0 mb-2`}>
              Sharing URL
            </DropdownMenuLabel>
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex-1 flex items-center rounded`}>
                <span className={`px-3 py-2 text-xs ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'} rounded-l border-r border-gray-500`}>
                  {getShortUrl()}
                </span>
                <span className={`text-[13px] px-3 font-light ${notesTheme === 'light' ? 'text-black/90' : 'text-gray-300'}`}>
                  /view
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-2 text-xs rounded transition-colors ${copied
                  ? 'bg-green-600 text-white'
                  : `${notesTheme === 'light' ? 'bg-icon-notenavbar-light text-black' : 'bg-icon-notenavbar text-white'}`
                  }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleChangeLink}
                className={`px-3 py-1 text-xs rounded transition-colors ${notesTheme === 'light' ? 'bg-icon-notenavbar-light text-black' : 'bg-icon-notenavbar text-white'} hover:bg-icon-notenavbar/30`}
                title="Generate new sharing link"
              >
                Change Link
              </button>
            </div>
          </div>

          <DropdownMenuSeparator className="bg-gray-700" />

          {/* Copy Share Link Button */}
          <div className="p-3">
            <button
              onClick={handleCopyLink}
              className={`w-full cursor-pointer px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 
                ${copied ? 'bg-green-600 text-white'
                  : `${notesTheme === 'light' ? 'bg-icon-notenavbar-light text-black' : 'bg-icon-notenavbar text-white'}`
                }`
              }
            >
              <Copy size={16} />
              {copied ? 'Link Copied!' : 'Copy share link'}
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu >

      {/* Edit Dialog */}
      < Dialog open={showEditDialog} onOpenChange={setShowEditDialog} >
        <DialogContent className={`bg-secondary border-gray-600 text-white ${notesTheme === 'light' ? 'share-dropdown--light' : ''}`}>
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit Shared Link
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Modify the settings for this shared link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Permission Settings */}
            <div>
              <Label className="text-sm font-medium text-gray-300 mb-2 block">
                Access Permission
              </Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="editReadPermission"
                    value="public"
                    checked={editForm.readPermission === 'public'}
                    onChange={(e) => updateEditForm('readPermission', e.target.value)}
                    className="text-blue-600"
                  />
                  <Globe className="h-4 w-4 text-gray-300" />
                  <span>Public - Anyone with the link can view</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="editReadPermission"
                    value="password-required"
                    checked={editForm.readPermission === 'password-required'}
                    onChange={(e) => updateEditForm('readPermission', e.target.value)}
                    className="text-blue-600"
                  />
                  <Lock className="h-4 w-4 text-gray-300" />
                  <span>Password Required</span>
                </label>
              </div>
            </div>

            {/* Password Field */}
            {editForm.readPermission === 'password-required' && (
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">
                  Password
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={editForm.readPassword}
                    onChange={(e) => updateEditForm('readPassword', e.target.value)}
                    placeholder="Enter password"
                    className="flex-1 bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Button
                    variant="outline"
                    onClick={() => updateEditForm('readPassword', generatePassword())}
                    className="px-3 bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:text-white"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            )}

            {/* Expiration Settings */}
            <div>
              <Label className="text-sm font-medium text-gray-300 mb-2 block">
                Expiration
              </Label>
              <select
                value={editForm.expireAt === null ? 'forever' : 'custom'}
                onChange={e => {
                  if (e.target.value === 'forever') {
                    updateEditForm('expireAt', null);
                  } else {
                    const d = new Date();
                    d.setDate(d.getDate());
                    updateEditForm('expireAt', d.toISOString().slice(0, 16));
                  }
                }}
                className="px-2 py-1 rounded bg-secondary text-white text-[15px] border-none outline-none mb-2"
              >
                <option value="forever">Never Expires</option>
                <option value="custom">Custom Date/Time</option>
              </select>
            </div>

            {editForm.expireAt !== null && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Label htmlFor="edit-date-picker" className="px-1 text-gray-300">
                    Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild className='h-[26px]'>
                      <Button
                        variant="outline"
                        id="edit-date-picker"
                        className="w-auto justify-between font-normal bg-secondary text-white border-gray-600 hover:bg-gray-600 hover:text-white"
                      >
                        {editForm.expireAt
                          ? format(new Date(editForm.expireAt), 'PPP')
                          : format(new Date(), 'PPP')}
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0 bg-secondary text-white border-gray-600" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editForm.expireAt ? new Date(editForm.expireAt) : new Date()}
                        captionLayout="dropdown"
                        // Ensure dropdowns are enabled and populated
                        fromYear={2000}
                        toYear={2100}
                        // Open at the selected month by default
                        defaultMonth={editForm.expireAt ? new Date(editForm.expireAt) : new Date()}
                        onSelect={(date) => {
                          if (date) {
                            const time = editForm.selectedTime || format(new Date(), 'HH:mm:ss');
                            updateEditForm('expireAt', `${format(date, "yyyy-MM-dd")}T${time}`);
                          }
                        }}
                        className="rounded-lg border-gray-600 text-white [&_.rdp-button]:text-white [&_.rdp-button]:hover:bg-gray-700 [&_.rdp-button]:hover:text-white [&_.rdp-caption]:text-white [&_.rdp-weekday]:text-gray-300 [&_.rdp-day]:text-white [&_.rdp-day_button]:text-white [&_.rdp-day_button]:hover:bg-gray-700 [&_.rdp-day_button]:hover:text-white [&_.rdp-day_button[data-selected=true]]:bg-blue-600 [&_.rdp-day_button[data-selected=true]]:text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div
                  onFocusCapture={() => setIsTimePicking(true)}
                  onBlurCapture={() => setTimeout(() => setIsTimePicking(false), 0)}
                >
                  <TimePicker
                    value={editForm.selectedTime}
                    onChange={(value) => updateEditForm('selectedTime', value)}
                    label="Time"
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:text-white transition-colors"
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} className="bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Delete Confirmation Dialog */}
      < Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} >
        <DialogContent className={`bg-main border-none text-white ${notesTheme === 'light' ? 'share-dropdown--light' : ''}`}>
          <DialogHeader>
            <DialogTitle className="text-white">Delete Shared Link</DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to delete this shared link? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:text-white transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Link Copy Notification (render in portal to avoid transform/overflow issues) */}
      {
        showAlert && typeof window !== 'undefined' && createPortal(
          <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
            <Alert variant="default" className="alert-custom w-80 pointer-events-auto bg-sidebar">
              <CheckCircle2Icon className="h-5 w-5" />
              <AlertTitle>Link copied!</AlertTitle>
              <AlertDescription>
                The sharing link has been copied to your clipboard.
              </AlertDescription>
            </Alert>
          </div>,
          document.body
        )
      }

    </>
  );
}
