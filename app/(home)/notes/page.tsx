'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Menu, PanelLeftOpen, Image as ImageIcon } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { useDrive } from '../../lib/driveContext';
import { driveService } from '../../lib/googleDrive';
import '../../lib/types';
import { NoteSidebar, NotePreview, NoteSplitEditor, NoteRegularEditor } from './_components';
import RenameDialog from './_components/RenameDialog';
import NoteNavbar from './_components/NoteNavbar';
import { LoadingSpinner } from './_components/LoadingSpinner';
import { ImageManager } from './_components/ImageManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
} from './_hooks';

// Import utilities
import { startEdit, cancelEdit, closeNote } from './_utils/noteActions';
import { clearAllData, setupDebugUtils } from './_utils/debugUtils';
// Removed: heading-based sync is now self-contained in NoteSplitEditor

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
    isMobileSidebarOpen, setIsMobileSidebarOpen,
    isSidebarHidden, setIsSidebarHidden,
    draggedItem, setDraggedItem,
    dragOver, setDragOver,
    sidebarWidth, setSidebarWidth,
    isResizing, setIsResizing,
    isRenameDialogOpen, setIsRenameDialogOpen,
    renameItem, setRenameItem,
    isImageManagerOpen, setIsImageManagerOpen,
  } = useNotesState();

  const {
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    previewFontSize, setPreviewFontSize,
  } = useFontSettings();

  const {
    currentTheme, setCurrentTheme,
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
    notes, setNotes, folders, setFolders, setIsLoading, setSyncProgress
  );

  const { isSignedIn, signIn, signOut, checkSignInStatus } = useDrive();

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
    setIsCreatingNote, deleteNote, createNoteFromCurrentContent
  );

  useSidebarResize(isResizing, setIsResizing, setSidebarWidth);
  useResponsiveLayout(isSplitMode, setIsSplitMode);

  // Initialize data and sync with Drive
  useEffect(() => {
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
  }, [isSignedIn, syncWithDrive, setHasSyncedWithDrive, setIsInitialized]);

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

  // Show loading spinner while initializing
  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#222831' }}>
      <div className="flex flex-1 overflow-hidden">
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
          onToggleFolder={toggleFolder}
          onSelectNote={setSelectedNote}
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
          onDrop={(e, targetId) => handleDrop(e, targetId, draggedItem, setDraggedItem, setDragOver)}
          onSetDragOver={setDragOver}
          onSetIsResizing={setIsResizing}
          onSetIsMobileSidebarOpen={setIsMobileSidebarOpen}
          onToggleSidebar={toggleSidebar}
          onForceSync={forceSync}
          onSignIn={() => {
            // Use the popup OAuth flow that returns refresh tokens
            driveService.signIn();
          }}
          onSignOut={signOut}
        />

        {/* Main content area */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
          {selectedNote ? (
            <>
              {/* Note Header */}
              <NoteNavbar
                selectedNote={selectedNote}
                isEditing={isEditing}
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                setIsSplitMode={setIsSplitMode}
                isSplitMode={isSplitMode}
                tabSize={tabSize}
                setTabSize={setTabSize}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                themeOptions={themeOptions}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                fontSize={fontSize}
                setFontSize={setFontSize}
                previewFontSize={previewFontSize}
                setPreviewFontSize={setPreviewFontSize}
                saveNote={saveNote}
                cancelEdit={() => cancelEdit(setIsEditing, setEditTitle, setEditContent, setIsSplitMode)}
                startEdit={() => startEdit(selectedNote, setIsEditing, setEditTitle, setEditContent, setIsSplitMode)}
                isMobileSidebarOpen={isMobileSidebarOpen}
                onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                onCloseNote={() => closeNote(setSelectedNote, setEditTitle, setEditContent, setIsEditing, setIsSplitMode)}
                isSidebarHidden={isSidebarHidden}
                onToggleSidebar={toggleSidebar}
                onOpenImageManager={() => setIsImageManagerOpen(true)}
              />

              {/* Note Content */}
              <div
                className="flex-1 overflow-hidden lg:rounded-bl-2xl lg:rounded-br-2xl"
                style={{
                  backgroundColor: '#222831',
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                  transition: 'font-family 0.2s, font-size 0.2s',
                }}
              >
                {isEditing ? (
                  isSplitMode ? (
                    /* Split Mode: Raw + Preview */
                    <NoteSplitEditor
                      editContent={editContent}
                      setEditContent={setEditContent}
                      notes={notes}
                      folders={folders}
                      selectedNote={selectedNote}
                      setNotes={setNotes}
                      setSelectedNote={setSelectedNote}
                      isSignedIn={isSignedIn}
                      driveService={driveService}
                      tabSize={tabSize}
                      fontSize={fontSize}
                      previewFontSize={previewFontSize}
                      setIsLoading={setIsLoading}
                      setSyncProgress={setSyncProgress}
                    />
                  ) : (
                    /* Regular Edit Mode */
                    <NoteRegularEditor
                      editContent={editContent}
                      setEditContent={setEditContent}
                      tabSize={tabSize}
                      fontSize={fontSize}
                      notes={notes}
                      folders={folders}
                      selectedNote={selectedNote}
                      setIsLoading={setIsLoading}
                      setSyncProgress={setSyncProgress}
                    />
                  )
                ) : (
                  /* Preview Only Mode */
                  <NotePreview
                    selectedNote={selectedNote}
                    notes={notes}
                    setNotes={setNotes}
                    setSelectedNote={setSelectedNote}
                    isSignedIn={isSignedIn}
                    driveService={driveService}
                    previewFontSize={previewFontSize}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              {/* Mobile Header for No Note Selected */}
              <div className="lg:hidden border-b border-gray-600 px-6 py-4 flex-shrink-0" style={{ backgroundColor: '#31363F' }}>
                <div className="flex items-center">
                  <button
                    onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                    className="p-2 mr-3 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                    title="Toggle sidebar"
                  >
                    <Menu size={20} />
                  </button>
                  <h1 className="text-xl font-semibold text-white">Notes</h1>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center relative" style={{ backgroundColor: '#222831' }}>
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
            </>
          )}
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={(open) => {
        setIsCreatingFolder(open);
        if (!open) setNewFolderName('');
      }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#31363F', borderColor: '#4a5568' }}>
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
              style={{ backgroundColor: '#222831' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createFolder(newFolderName);
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
              onClick={() => createFolder(newFolderName)}
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
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#31363F', borderColor: '#4a5568' }}>
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
              style={{ backgroundColor: '#222831' }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createNote(newNoteName);
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
              onClick={() => createNote(newNoteName)}
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
          isSignedIn={isSignedIn}
          onClose={() => setIsImageManagerOpen(false)}
        />
      )}
    </div>
  );
}
