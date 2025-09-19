'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Menu, PanelLeftOpen, Image as ImageIcon, X } from 'lucide-react';
import { addDays } from 'date-fns';
import 'katex/dist/katex.min.css';
import { useDrive } from '../../lib/driveContext';
import { driveService } from './services/googleDrive';
import '../../lib/types';
import { NoteSidebar, NotePreview, NoteSplitEditor, NoteRegularEditor, CalendarPanel } from './components';
import RenameDialog from './components/modals/RenameDialog';
import NoteNavbar from './components/sidebar/navigation/NoteNavbar';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ImageManager } from './components/images/management/ImageManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import PWALoadingState from '../../components/PWALoadingState';

// Import custom hooks
import {
  useNotesState,
  useFontSettings,
  useThemeSettings,
  useDriveSync,
  useNoteOperations,
  useFolderOperations,
  useDragAndDrop,
  useKeyboardShortcuts,
  useSidebarResize,
  useResponsiveLayout,
} from './hooks';

// Import utilities
import { startEdit, cancelEdit, closeNote } from './utils/core/noteActions';
import { clearAllData, setupDebugUtils } from './utils/debug/debugUtils';
// Removed: heading-based sync is now self-contained in NoteSplitEditor

import React, { useMemo } from 'react';
import { Note } from './components/types';

// Memoized note content wrapper to prevent re-renders when folders change
const MemoizedNoteContent = React.memo(({
  isEditing,
  isSplitMode,
  isPreviewMode,
  editContent,
  setEditContent,
  notes,
  selectedNote,
  setNotes,
  setSelectedNote,
  isSignedIn,
  driveService,
  tabSize,
  fontSize,
  previewFontSize,
  codeBlockFontSize,
  setIsLoading,
  setSyncProgress,
  notesTheme
}: {
  isEditing: boolean;
  isSplitMode: boolean;
  isPreviewMode: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  notes: Note[];
  selectedNote: Note | null;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  isSignedIn: boolean;
  driveService: any;
  tabSize: number;
  fontSize: string;
  previewFontSize: string;
  codeBlockFontSize: string;
  setIsLoading: (loading: boolean) => void;
  setSyncProgress: (progress: number) => void;
  notesTheme: 'light' | 'dark';
}) => {
  if (!isEditing) {
    if (!selectedNote) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText size={64} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">Select a note to start reading</p>
          </div>
        </div>
      );
    }

    return (
      <NotePreview
        selectedNote={selectedNote}
        notes={notes}
        setNotes={setNotes}
        setSelectedNote={setSelectedNote}
        isSignedIn={isSignedIn}
        driveService={driveService}
        previewFontSize={previewFontSize}
        codeBlockFontSize={codeBlockFontSize}
      />
    );
  }

  if (isPreviewMode) {
    if (!selectedNote) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText size={64} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-lg">Select a note to start reading</p>
          </div>
        </div>
      );
    }
    return (
      <NotePreview
        selectedNote={selectedNote}
        notes={notes}
        setNotes={setNotes}
        setSelectedNote={setSelectedNote}
        isSignedIn={isSignedIn}
        driveService={driveService}
        previewFontSize={previewFontSize}
        codeBlockFontSize={codeBlockFontSize}
        overrideContent={editContent}
      />
    );
  }

  if (isSplitMode) {
    return (
      <NoteSplitEditor
        editContent={editContent}
        setEditContent={setEditContent}
        notes={notes}
        selectedNote={selectedNote}
        setNotes={setNotes}
        setSelectedNote={setSelectedNote}
        isSignedIn={isSignedIn}
        driveService={driveService}
        tabSize={tabSize}
        fontSize={fontSize}
        previewFontSize={previewFontSize}
        codeBlockFontSize={codeBlockFontSize}
        setIsLoading={setIsLoading}
        setSyncProgress={setSyncProgress}
        notesTheme={notesTheme}
      />
    );
  }

  return (
    <NoteRegularEditor
      editContent={editContent}
      setEditContent={setEditContent}
      tabSize={tabSize}
      fontSize={fontSize}
      notes={notes}
      selectedNote={selectedNote}
      codeBlockFontSize={codeBlockFontSize}
      setIsLoading={setIsLoading}
      setSyncProgress={setSyncProgress}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render when content or editing state actually changes
  return (
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isSplitMode === nextProps.isSplitMode &&
    prevProps.isPreviewMode === nextProps.isPreviewMode &&
    prevProps.editContent === nextProps.editContent &&
    // Re-render when selected note identity-relevant fields change
    prevProps.selectedNote?.id === nextProps.selectedNote?.id &&
    prevProps.selectedNote?.content === nextProps.selectedNote?.content &&
    prevProps.selectedNote?.path === nextProps.selectedNote?.path &&
    prevProps.selectedNote?.title === nextProps.selectedNote?.title &&
    prevProps.selectedNote?.driveFileId === nextProps.selectedNote?.driveFileId &&
    prevProps.isSignedIn === nextProps.isSignedIn &&
    // Re-render when formatting settings change
    prevProps.tabSize === nextProps.tabSize &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.previewFontSize === nextProps.previewFontSize &&
    prevProps.codeBlockFontSize === nextProps.codeBlockFontSize
  );
});

MemoizedNoteContent.displayName = 'MemoizedNoteContent';

export default function NotesPage() {

  // Use custom hooks for state management
  const {
    notes, setNotes,
    folders, setFolders,
    selectedNote, setSelectedNote,
    selectedPath, setSelectedPath,
    isEditing, setIsEditing,
    editContent, setEditContent,
    editTitle, setEditTitle,
    newFolderName, setNewFolderName,
    newNoteName, setNewNoteName,
    isCreatingFolder, setIsCreatingFolder,
    isCreatingNote, setIsCreatingNote,
    isLoading, setIsLoading,
    syncProgress, setSyncProgress,
    isSplitMode, setIsSplitMode,
    isPreviewMode, setIsPreviewMode,
    isMobileSidebarOpen, setIsMobileSidebarOpen,
    isSidebarHidden, setIsSidebarHidden,
    draggedItem, setDraggedItem,
    dragOver, setDragOver,
    sidebarWidth, setSidebarWidth,
    isResizing, setIsResizing,
    isRenameDialogOpen, setIsRenameDialogOpen,
    renameItem, setRenameItem,
    isImageManagerOpen, setIsImageManagerOpen,
    isImagesSectionExpanded, setIsImagesSectionExpanded,
  } = useNotesState();

  const {
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    previewFontSize, setPreviewFontSize,
    codeBlockFontSize, setCodeBlockFontSize,
  } = useFontSettings();

  const {
    currentTheme, setCurrentTheme,
    notesTheme, setNotesTheme,
    tabSize, setTabSize,
    themeOptions,
  } = useThemeSettings();

  const {
    hasSyncedWithDrive,
    setHasSyncedWithDrive,
    isInitialized,
    setIsInitialized,
    syncWithDrive,
    forceSync,
    clearCacheAndSync,
  } = useDriveSync(notes, setNotes, folders, setFolders, setIsLoading, setSyncProgress);

  const {
    createNote,
    createNoteFromCurrentContent,
    saveNote,
    deleteNote,
    renameNote,
  } = useNoteOperations(
    notes, setNotes, folders, selectedNote, setSelectedNote, selectedPath,
    editContent, editTitle, setIsLoading, setSyncProgress, setIsEditing,
    setIsSplitMode, setEditContent, setEditTitle
  );

  const {
    createFolder,
    deleteFolder,
    renameFolder,
    toggleFolder,
  } = useFolderOperations(
    notes, setNotes, folders, setFolders, selectedPath,
    setIsLoading, setSyncProgress
  );

  const {
    handleDragStart,
    handleDragOver,
    handleDrop,
  } = useDragAndDrop(
    notes, setNotes, folders, setFolders, setIsLoading, setSyncProgress, selectedNote, setSelectedNote
  );

  const { isSignedIn, isInitialized: isAuthInitialized, signIn, signOut, checkSignInStatus } = useDrive();

  // Check for OAuth success after hooks are initialized
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth_success') === 'true') {
      // Remove the auth_success parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth_success');
      window.history.replaceState({}, document.title, newUrl.toString());

      // Process temporary tokens if they exist
      const processTokens = async () => {
        try {
          // Small delay to ensure tokens are properly stored
          await new Promise(resolve => setTimeout(resolve, 100));

          // Force a fresh check of sign-in status after authentication
          if (checkSignInStatus) {
            await checkSignInStatus();
          }
        } catch (error) {
          console.error('Error processing authentication:', error);
        }
      };

      processTokens();
    }

    const authError = urlParams.get('auth_error');
    if (authError) {
      // Remove the auth_error parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth_error');
      window.history.replaceState({}, document.title, newUrl.toString());

      // Google Drive authentication error
      // You might want to show an error message to the user here
    }
  }, [checkSignInStatus]);

  // Scroll synchronization handled inside NoteSplitEditor

  // Use custom hooks for side effects
  useKeyboardShortcuts(
    isEditing, isSplitMode, selectedNote, setIsEditing, setIsSplitMode,
    setIsCreatingNote, deleteNote, createNoteFromCurrentContent, saveNote
  );

  useSidebarResize(isResizing, setIsResizing, setSidebarWidth);
  useResponsiveLayout(isSplitMode, setIsSplitMode);

  // Initialize data and sync with Drive - wait for auth to be initialized first
  useEffect(() => {
    // Only proceed if authentication has been properly initialized
    if (!isAuthInitialized) {
      return;
    }

    const initializeData = async () => {
      try {
        const savedHasSynced = localStorage.getItem('has-synced-drive');

        // Then check Google Drive status (slower, but non-blocking)
        setTimeout(async () => {
          // Sync with Drive if signed in and haven't synced yet
          if (isSignedIn && !JSON.parse(savedHasSynced || 'false')) {
            syncWithDrive();
          } else if (!isSignedIn) {
            // Reset sync flag when signed out
            setHasSyncedWithDrive(false);
          }
        }, 100);

        setIsInitialized(true);
      } catch (error) {
        // Failed to initialize notes
        setIsInitialized(true);
      }
    };

    initializeData();
  }, [isAuthInitialized, isSignedIn, syncWithDrive, setHasSyncedWithDrive, setIsInitialized]);

  // No external scroll sync cleanup needed

  // Setup debug utilities
  useEffect(() => {
    const clearAllDataFn = () => clearAllData(
      setNotes, setFolders, setSelectedNote, setHasSyncedWithDrive, setIsSidebarHidden
    );
    setupDebugUtils(clearAllDataFn);
  }, [setNotes, setFolders, setSelectedNote, setHasSyncedWithDrive, setIsSidebarHidden]);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarHidden(!isSidebarHidden);
  };

  // Handle rename confirm
  const handleRenameConfirm = async (newName: string) => {
    if (!renameItem) return;

    try {
      if (renameItem.type === 'folder') {
        await renameFolder(renameItem.id, renameItem.currentName, newName);
      } else {
        await renameNote(renameItem.id, renameItem.currentName, newName);
      }
    } catch (error) {
      // Failed to rename item
    } finally {
      setIsRenameDialogOpen(false);
      setRenameItem(null);
    }
  };

  // Handle rename actions
  const handleRenameFolder = (folderId: string, currentName: string) => {
    setRenameItem({
      id: folderId,
      currentName,
      type: 'folder'
    });
    setIsRenameDialogOpen(true);
  };

  const handleRenameNote = (noteId: string, currentTitle: string) => {
    setRenameItem({
      id: noteId,
      currentName: currentTitle,
      type: 'file'
    });
    setIsRenameDialogOpen(true);
  };

  // Create handlers: close dialogs on success
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName);
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  const handleCreateNote = async () => {
    if (!newNoteName.trim()) return;
    await createNote(newNoteName);
    setIsCreatingNote(false);
    setNewNoteName('');
  };

  // Calendar modal state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Unsaved changes confirmation state
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const [pendingNoteToSelect, setPendingNoteToSelect] = useState<Note | null>(null);

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedNote) return false;
    const contentChanged = editContent !== (selectedNote.content || '');
    const titleChanged = editTitle !== (selectedNote.title || '');
    return isEditing && (contentChanged || titleChanged);
  }, [isEditing, selectedNote, editContent, editTitle]);

  const performSwitchToNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
    setIsSplitMode(false);
    setIsPreviewMode(false);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  // Encryption handlers
  const handleEncryptNote = async (noteId: string, encryptedData: any) => {
    try {
      setIsLoading(true);
      setSyncProgress(10);

      const noteToEncrypt = notes.find(n => n.id === noteId);
      if (!noteToEncrypt) return;

      // Create encrypted note with encrypted content for Google Drive
      const encryptedContent = JSON.stringify({
        encrypted: true,
        data: encryptedData
      });

      const updatedNote = {
        ...noteToEncrypt,
        isEncrypted: true,
        encryptedData,
        // Keep original content for local display, but this will be overridden for Drive
        updatedAt: new Date().toISOString()
      };

      setSyncProgress(50);

      // Update in Drive with encrypted content if signed in
      if (isSignedIn && noteToEncrypt.driveFileId) {
        try {
          await driveService.updateFile(noteToEncrypt.driveFileId, encryptedContent);
          setSyncProgress(80);
        } catch (error) {
          console.error('Failed to update encrypted note in Drive:', error);
        }
      }

      // Update local notes
      setNotes(notes.map(note => note.id === noteId ? updatedNote : note));
      
      // Update selected note if it's the one being encrypted
      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }

      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 500);
    } catch (error) {
      console.error('Failed to encrypt note:', error);
      setSyncProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptNote = async (noteId: string, decryptedContent: string) => {
    try {
      setIsLoading(true);
      setSyncProgress(10);

      const noteToDecrypt = notes.find(n => n.id === noteId);
      if (!noteToDecrypt) return;

      const updatedNote = {
        ...noteToDecrypt,
        content: decryptedContent,
        isEncrypted: false,
        encryptedData: undefined,
        updatedAt: new Date().toISOString()
      };

      setSyncProgress(50);

      // Update in Drive with decrypted content if signed in
      if (isSignedIn && noteToDecrypt.driveFileId) {
        try {
          await driveService.updateFile(noteToDecrypt.driveFileId, decryptedContent);
          setSyncProgress(80);
        } catch (error) {
          console.error('Failed to update decrypted note in Drive:', error);
        }
      }

      // Update local notes
      setNotes(notes.map(note => note.id === noteId ? updatedNote : note));
      
      // Update selected note if it's the one being decrypted
      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
        setEditContent(decryptedContent);
      }

      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 500);
    } catch (error) {
      console.error('Failed to decrypt note:', error);
      setSyncProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const requestSelectNote = (note: Note) => {
    if (!note) return;
    if (hasUnsavedChanges) {
      setPendingNoteToSelect(note);
      setIsUnsavedDialogOpen(true);
      return;
    }
    performSwitchToNote(note);
  };

  // A guarded setter compatible with Dispatch signature used by children
  const guardedSetSelectedNote: React.Dispatch<React.SetStateAction<Note | null>> = (value) => {
    const next = typeof value === 'function' ? (value as (prev: Note | null) => Note | null)(selectedNote) : value;
    if (next) {
      requestSelectNote(next);
    } else {
      setSelectedNote(null);
    }
  };

  // Show enhanced loading state for PWA
  if (!isAuthInitialized || !isInitialized) {
    return (
      <PWALoadingState
        isAuthLoading={false}
        isDataLoading={false}
        isAuthInitialized={isAuthInitialized}
        isDataInitialized={isInitialized}
      >
        <LoadingSpinner />
      </PWALoadingState>
    );
  }

  return (
    <div className={`h-screen min-h-0 flex flex-col ${notesTheme === 'dark' ? 'notes-dark' : 'notes-light'}`} suppressHydrationWarning={true}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File Explorer Sidebar */}
        <NoteSidebar
          notes={notes}
          folders={folders}
          selectedNote={selectedNote}
          isSignedIn={isSignedIn}
          isLoading={isLoading}
          syncProgress={syncProgress}
          sidebarWidth={sidebarWidth}
          dragOver={dragOver}
          isResizing={isResizing}
          isMobileSidebarOpen={isMobileSidebarOpen}
          isSidebarHidden={isSidebarHidden}
          isImagesSectionExpanded={isImagesSectionExpanded}
          onToggleFolder={toggleFolder}
          onSelectNote={requestSelectNote}
          onSetSelectedPath={setSelectedPath}
          onSetIsCreatingFolder={setIsCreatingFolder}
          onSetIsCreatingNote={setIsCreatingNote}
          onDeleteFolder={deleteFolder}
          onDeleteNote={deleteNote}
          onRenameFolder={handleRenameFolder}
          onRenameNote={handleRenameNote}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e, targetId, dragged, newTitle) => handleDrop(e, targetId, dragged ?? draggedItem, setDraggedItem, setDragOver, newTitle)}
          onSetDragOver={setDragOver}
          onSetDraggedItem={setDraggedItem}
          onSetIsResizing={setIsResizing}
          onSetIsMobileSidebarOpen={setIsMobileSidebarOpen}
          onToggleSidebar={toggleSidebar}
          onToggleImagesSection={() => setIsImagesSectionExpanded(!isImagesSectionExpanded)}
          onForceSync={forceSync}
          onClearCacheAndSync={clearCacheAndSync}
          onSignIn={() => {
            const origin = encodeURIComponent(
              typeof window !== "undefined" ? window.location.pathname : "/"
            );
            window.location.href = `/api/auth/google?origin=${origin}`;
          }}
          onSignOut={signOut}
          onEncryptNote={handleEncryptNote}
          onDecryptNote={handleDecryptNote}
          notesTheme={notesTheme}
        />

        {/* Main content area */}
        <div className={`flex-1 min-h-0 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
          {/* Unsaved changes dialog */}
          <Dialog open={isUnsavedDialogOpen} onOpenChange={setIsUnsavedDialogOpen}>
            <DialogContent className="bg-main border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Unsaved changes</DialogTitle>
                <DialogDescription className="text-gray-300">
                  You have unsaved changes in the current note. Do you want to save before switching?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  className="px-3 py-1 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                  onClick={async () => {
                    await saveNote();
                    setIsUnsavedDialogOpen(false);
                    if (pendingNoteToSelect) performSwitchToNote(pendingNoteToSelect);
                    setPendingNoteToSelect(null);
                  }}
                >
                  Yes, save and switch
                </button>
                <button
                  className="px-3 py-1 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700"
                  onClick={() => {
                    setIsUnsavedDialogOpen(false);
                    if (pendingNoteToSelect) performSwitchToNote(pendingNoteToSelect);
                    setPendingNoteToSelect(null);
                  }}
                >
                  No, discard changes
                </button>
                <button
                  className="px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => {
                    setIsUnsavedDialogOpen(false);
                    setPendingNoteToSelect(null);
                  }}
                >
                  Cancel
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Note Header - Always show */}
          {selectedNote ? (
            <NoteNavbar
              selectedNote={selectedNote}
              isEditing={isEditing}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              setIsSplitMode={setIsSplitMode}
              isSplitMode={isSplitMode}
              notesTheme={notesTheme}
              setNotesTheme={setNotesTheme}
              fontFamily={fontFamily}
              setFontFamily={setFontFamily}
              fontSize={fontSize}
              setFontSize={setFontSize}
              previewFontSize={previewFontSize}
              setPreviewFontSize={setPreviewFontSize}
              codeBlockFontSize={codeBlockFontSize}
              setCodeBlockFontSize={setCodeBlockFontSize}
              currentTheme={currentTheme}
              setCurrentTheme={setCurrentTheme}
              themeOptions={themeOptions}
              tabSize={tabSize}
              setTabSize={setTabSize}
              saveNote={saveNote}
              cancelEdit={() => cancelEdit(setIsEditing, setEditTitle, setEditContent, setIsSplitMode)}
              startEdit={() => startEdit(selectedNote, setIsEditing, setEditTitle, setEditContent, setIsSplitMode)}
              isMobileSidebarOpen={isMobileSidebarOpen}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onCloseNote={() => closeNote(setSelectedNote, setEditTitle, setEditContent, setIsEditing, setIsSplitMode)}
              isSidebarHidden={isSidebarHidden}
              onToggleSidebar={toggleSidebar}
              onOpenImageManager={() => setIsImageManagerOpen(true)}
              onOpenCalendar={() => setIsCalendarOpen(true)}
              isPreviewMode={isPreviewMode}
              setIsPreviewMode={setIsPreviewMode}
            />
          ) : (
            <NoteNavbar
              selectedNote={{
                id: 'no-note',
                title: 'No Note Selected',
                content: '',
                path: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                driveFileId: undefined
              }}
              isEditing={false}
              editTitle=""
              setEditTitle={() => {}}
              setIsSplitMode={() => {}}
              isSplitMode={false}
              notesTheme={notesTheme}
              setNotesTheme={setNotesTheme}
              fontFamily={fontFamily}
              setFontFamily={setFontFamily}
              fontSize={fontSize}
              setFontSize={setFontSize}
              previewFontSize={previewFontSize}
              setPreviewFontSize={setPreviewFontSize}
              codeBlockFontSize={codeBlockFontSize}
              setCodeBlockFontSize={setCodeBlockFontSize}
              currentTheme={currentTheme}
              setCurrentTheme={setCurrentTheme}
              themeOptions={themeOptions}
              tabSize={tabSize}
              setTabSize={setTabSize}
              saveNote={() => {}}
              cancelEdit={() => {}}
              startEdit={() => {}}
              isMobileSidebarOpen={isMobileSidebarOpen}
              onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              onCloseNote={() => {}}
              isSidebarHidden={isSidebarHidden}
              onToggleSidebar={toggleSidebar}
              onOpenImageManager={() => setIsImageManagerOpen(true)}
              onOpenCalendar={() => setIsCalendarOpen(true)}
              isPreviewMode={false}
              setIsPreviewMode={() => {}}
              showLastUpdated={false}
            />
          )}

          {/* Note Content */}
          {selectedNote ? (
            <div
              className="flex-1 min-h-0 overflow-hidden notes-surface"
              style={{
                fontFamily: fontFamily,
                fontSize: fontSize,
                transition: 'font-family 0.2s, font-size 0.2s',
              }}
            >
              <MemoizedNoteContent
                isEditing={isEditing}
                isSplitMode={isSplitMode}
                isPreviewMode={isPreviewMode}
                editContent={editContent}
                setEditContent={setEditContent}
                notes={notes}
                selectedNote={selectedNote}
                setNotes={setNotes}
                setSelectedNote={setSelectedNote}
                isSignedIn={isSignedIn}
                driveService={driveService}
                tabSize={tabSize}
                fontSize={fontSize}
                previewFontSize={previewFontSize}
                codeBlockFontSize={codeBlockFontSize}
                setIsLoading={setIsLoading}
                setSyncProgress={setSyncProgress}
                notesTheme={notesTheme}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center relative notes-surface">
              {/* Floating sidebar toggle button */}
              {isSidebarHidden && (
                <button
                  onClick={toggleSidebar}
                  className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-gray-700/80 hover:bg-gray-600/80 text-gray-300 hover:text-white rounded-lg transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 shadow-lg backdrop-blur-sm"
                  title="Show sidebar"
                >
                  <PanelLeftOpen size={16} />
                  <span className="text-sm">Sidebar</span>
                </button>
              )}

              <div className="text-center">
                <FileText size={64} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-300 text-lg">Select a note to start reading</p>
                <p className="text-gray-500 text-sm mt-2">Create a new note or select an existing one from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={(open) => {
        setIsCreatingFolder(open);
        if (!open) setNewFolderName('');
      }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#31363F', borderColor: '#4a5568' }} suppressHydrationWarning={true}>
          <DialogHeader>
            <DialogTitle className="text-white">Create New Folder</DialogTitle>
            <DialogDescription className="text-gray-300">
              {selectedPath ? (
                <>📁 Creating in: /{selectedPath}</>
              ) : (
                <>📁 Creating in: Root</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#222831' }} suppressHydrationWarning={true}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreateFolder();
                } else if (e.key === 'Escape') {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
              }}
              className="px-4 py-2 text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleCreateFolder()}
              disabled={!newFolderName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Note Dialog */}
      <Dialog open={isCreatingNote} onOpenChange={(open) => {
        setIsCreatingNote(open);
        if (!open) setNewNoteName('');
      }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#31363F', borderColor: '#4a5568' }} suppressHydrationWarning={true}>
          <DialogHeader>
            <DialogTitle className="text-white">
              Create New Note
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {selectedPath ? (
                <>Creating in: /{selectedPath}</>
              ) : (
                <>Creating in: Root</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              value={newNoteName}
              onChange={(e) => setNewNoteName(e.target.value)}
              placeholder="Note title"
              className="w-full px-3 py-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#222831' }} suppressHydrationWarning={true}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreateNote();
                } else if (e.key === 'Escape') {
                  setIsCreatingNote(false);
                  setNewNoteName('');
                }
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setIsCreatingNote(false);
                setNewNoteName('');
              }}
              className="px-4 py-2 text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleCreateNote()}
              disabled={!newNoteName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={isRenameDialogOpen}
        onClose={() => {
          setIsRenameDialogOpen(false);
          setRenameItem(null);
        }}
        onConfirm={handleRenameConfirm}
        currentName={renameItem?.currentName || ''}
        type={renameItem?.type || 'file'}
      />

      {/* Image Manager */}
      {isImageManagerOpen && (
        <ImageManager
          notes={notes}
          selectedNote={selectedNote}
          setEditContent={setEditContent}
          setNotes={setNotes}
          setSelectedNote={setSelectedNote}
          isSignedIn={isSignedIn}
          onClose={() => setIsImageManagerOpen(false)}
        />
      )}

      {/* Full Screen Calendar Overlay */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-[9999] bg-main" suppressHydrationWarning={true}>
          <div className="h-full flex flex-col">
            {/* Calendar Content */}
            <div className="flex-1 overflow-hidden relative">
              <CalendarPanel
                currentDate={calendarDate}
                onPrev={() => setCalendarDate(prev => addDays(prev, -7))}
                onNext={() => setCalendarDate(prev => addDays(prev, 7))}
                onToday={() => setCalendarDate(new Date())}
                onClose={() => setIsCalendarOpen(false)}
              />
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}