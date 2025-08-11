import { useState, useEffect } from 'react';
import { Note, Folder } from '../_components/types';

export const useNotesState = () => {
  // Core data state
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'root', name: 'Notes', path: '', parentId: '', expanded: true }
  ]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedPath, setSelectedPath] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Creation state
  const [newFolderName, setNewFolderName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-hidden') === 'true';
    }
    return false;
  });

  // Drag & Drop state
  const [draggedItem, setDraggedItem] = useState<{ type: 'note' | 'folder', id: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Rename dialog state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<{
    id: string;
    currentName: string;
    type: 'file' | 'folder';
  } | null>(null);

  // Image manager state
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [isImagesSectionExpanded, setIsImagesSectionExpanded] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes-new');
    const savedFolders = localStorage.getItem('folders-new');
    const savedSidebarWidth = localStorage.getItem('sidebar-width');
    const savedSelectedNoteId = localStorage.getItem('selected-note-id');

    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      const uniqueNotes = parsedNotes.filter((note: Note, index: number, array: Note[]) => {
        if (note.driveFileId) {
          return array.findIndex(n => n.driveFileId === note.driveFileId) === index;
        } else {
          return array.findIndex(n => n.id === note.id) === index;
        }
      });
      setNotes(uniqueNotes);
    }

    if (savedFolders) {
      const parsedFolders = JSON.parse(savedFolders);
      const uniqueFolders = parsedFolders.filter((folder: Folder, index: number, array: Folder[]) => {
        if (folder.driveFolderId) {
          return array.findIndex(f => f.driveFolderId === folder.driveFolderId) === index;
        } else {
          return array.findIndex(f => f.id === folder.id) === index;
        }
      });
      setFolders(uniqueFolders);
    }

    if (savedSidebarWidth) {
      setSidebarWidth(parseInt(savedSidebarWidth));
    }

    // Restore selected note if exists
    if (savedSelectedNoteId) {
      const parsedNotes = savedNotes ? JSON.parse(savedNotes) : [];
      const noteToRestore = parsedNotes.find((note: Note) => note.id === savedSelectedNoteId);
      if (noteToRestore) {
        setSelectedNote(noteToRestore);
        setEditContent(noteToRestore.content || '');
        setEditTitle(noteToRestore.title || '');
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    const uniqueNotes = notes.filter((note, index, array) => {
      if (note.driveFileId) {
        return array.findIndex(n => n.driveFileId === note.driveFileId) === index;
      } else {
        return array.findIndex(n => n.id === note.id) === index;
      }
    });

    if (uniqueNotes.length !== notes.length) {
      setNotes(uniqueNotes);
    } else {
      localStorage.setItem('notes-new', JSON.stringify(uniqueNotes));
    }
  }, [notes]);

  useEffect(() => {
    const uniqueFolders = folders.filter((folder, index, array) => {
      if (folder.driveFolderId) {
        return array.findIndex(f => f.driveFolderId === folder.driveFolderId) === index;
      } else {
        return array.findIndex(f => f.id === folder.id) === index;
      }
    });

    if (uniqueFolders.length !== folders.length) {
      setFolders(uniqueFolders);
    } else {
      localStorage.setItem('folders-new', JSON.stringify(uniqueFolders));
    }
  }, [folders]);

  // Save sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Save sidebar visibility to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-hidden', isSidebarHidden.toString());
  }, [isSidebarHidden]);

  // Save selected note to localStorage
  useEffect(() => {
    if (selectedNote) {
      localStorage.setItem('selected-note-id', selectedNote.id);
    } else {
      localStorage.removeItem('selected-note-id');
    }
  }, [selectedNote]);

  return {
    // Core data
    notes,
    setNotes,
    folders,
    setFolders,
    selectedNote,
    setSelectedNote,
    selectedPath,
    setSelectedPath,

    // Editing
    isEditing,
    setIsEditing,
    editContent,
    setEditContent,
    editTitle,
    setEditTitle,

    // Creation
    newFolderName,
    setNewFolderName,
    newNoteName,
    setNewNoteName,
    isCreatingFolder,
    setIsCreatingFolder,
    isCreatingNote,
    setIsCreatingNote,

    // UI
    isLoading,
    setIsLoading,
    syncProgress,
    setSyncProgress,
    isSplitMode,
    setIsSplitMode,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isSidebarHidden,
    setIsSidebarHidden,

    // Drag & Drop
    draggedItem,
    setDraggedItem,
    dragOver,
    setDragOver,

    // Sidebar
    sidebarWidth,
    setSidebarWidth,
    isResizing,
    setIsResizing,

    // Rename
    isRenameDialogOpen,
    setIsRenameDialogOpen,
    renameItem,
    setRenameItem,

    // Image Manager
    isImageManagerOpen,
    setIsImageManagerOpen,
    isImagesSectionExpanded,
    setIsImagesSectionExpanded,
  };
}; 