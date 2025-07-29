'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AuthenticatedLayout from '../../components/AuthenticatedLayout';
import { FileText, Edit, Save, X, Split } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { useDrive } from '../../lib/driveContext';
import { driveService } from '../../lib/googleDrive';
import '../../lib/types';
import { NoteSidebar, NotePreview, NoteSplitEditor, NoteRegularEditor, ShareDropdown } from './_components';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Note, Folder } from './_components/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ContextMenu, 
  ContextMenuTrigger, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuSeparator,
  ContextMenuShortcut 
} from '@/components/ui/context-menu';

export default function NotesPage() {
  // Tab size state for editor
  const [tabSize, setTabSize] = useState(2);
  const { isSignedIn } = useDrive();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'root', name: 'Notes', path: '', parentId: '', expanded: true }
  ]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Drag & Drop and Context Menu states
  const [draggedItem, setDraggedItem] = useState<{type: 'note' | 'folder', id: string} | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  
  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  
  // Track if we've already synced with Drive
  const [hasSyncedWithDrive, setHasSyncedWithDrive] = useState(false);
  
  // Split-screen mode state
  const [isSplitMode, setIsSplitMode] = useState(false);

  // Utility function to clear all localStorage data (for debugging)
  const clearAllData = () => {
    localStorage.removeItem('notes-new');
    localStorage.removeItem('folders-new');
    localStorage.removeItem('has-synced-drive');
    localStorage.removeItem('sidebar-width');
    setNotes([]);
    setFolders([{ id: 'root', name: 'Notes', path: '', parentId: '', expanded: true }]);
    setHasSyncedWithDrive(false);
    console.log('All data cleared');
  };

  // Add to window for debugging (remove in production)
  if (typeof window !== 'undefined') {
    (window as unknown as { clearAllData: () => void }).clearAllData = clearAllData;
  }

  // Load data from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes-new'); // Đổi từ 'notes-drive' thành 'notes-new' để thống nhất
    const savedFolders = localStorage.getItem('folders-new');
    const savedSidebarWidth = localStorage.getItem('sidebar-width');
    const savedHasSynced = localStorage.getItem('has-synced-drive');
    
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      // Remove duplicate notes based on driveFileId or id
      const uniqueNotes = parsedNotes.filter((note: Note, index: number, array: Note[]) => {
        if (note.driveFileId) {
          // If note has driveFileId, use that for uniqueness
          return array.findIndex(n => n.driveFileId === note.driveFileId) === index;
        } else {
          // If no driveFileId, use regular id
          return array.findIndex(n => n.id === note.id) === index;
        }
      });
      setNotes(uniqueNotes);
    }
    
    if (savedFolders) {
      const parsedFolders = JSON.parse(savedFolders);
      // Remove duplicate folders based on driveFolderId or id
      const uniqueFolders = parsedFolders.filter((folder: Folder, index: number, array: Folder[]) => {
        if (folder.driveFolderId) {
          // If folder has driveFolderId, use that for uniqueness
          return array.findIndex(f => f.driveFolderId === folder.driveFolderId) === index;
        } else {
          // If no driveFolderId, use regular id
          return array.findIndex(f => f.id === folder.id) === index;
        }
      });
      setFolders(uniqueFolders);
    }
    
    if (savedSidebarWidth) {
      setSidebarWidth(parseInt(savedSidebarWidth));
    }
    
    if (savedHasSynced) {
      setHasSyncedWithDrive(JSON.parse(savedHasSynced));
    }

    // Sync with Drive if signed in and haven't synced yet
    if (isSignedIn && !JSON.parse(savedHasSynced || 'false')) {
      syncWithDrive();
    } else if (!isSignedIn) {
      // Reset sync flag when signed out
      setHasSyncedWithDrive(false);
    }
  }, [isSignedIn]); // syncWithDrive is defined below, dependency not needed here

  // Save data to localStorage
  useEffect(() => {
    // Remove duplicates before saving
    const uniqueNotes = notes.filter((note, index, array) => {
      if (note.driveFileId) {
        return array.findIndex(n => n.driveFileId === note.driveFileId) === index;
      } else {
        return array.findIndex(n => n.id === note.id) === index;
      }
    });
    
    // Only save if there are changes to avoid infinite loops
    if (uniqueNotes.length !== notes.length) {
      setNotes(uniqueNotes);
    } else {
      localStorage.setItem('notes-new', JSON.stringify(uniqueNotes));
    }
  }, [notes]);

  useEffect(() => {
    // Remove duplicates before saving
    const uniqueFolders = folders.filter((folder, index, array) => {
      if (folder.driveFolderId) {
        return array.findIndex(f => f.driveFolderId === folder.driveFolderId) === index;
      } else {
        return array.findIndex(f => f.id === folder.id) === index;
      }
    });
    
    // Only save if there are changes to avoid infinite loops
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
  
  // Save sync status to localStorage
  useEffect(() => {
    localStorage.setItem('has-synced-drive', JSON.stringify(hasSyncedWithDrive));
  }, [hasSyncedWithDrive]);
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + E to toggle edit mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setIsEditing(!isEditing);
      }
      
      // Ctrl/Cmd + \ to toggle split mode (only in edit mode)
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        if (isEditing) {
          setIsSplitMode(!isSplitMode);
        }
      }
      
      // Ctrl/Cmd + Shift + S to toggle split mode (legacy)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (isEditing) {
          setIsSplitMode(!isSplitMode);
        }
      }
      
      // Ctrl/Cmd + N to create new note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (e.shiftKey) {
          // Ctrl/Cmd + Shift + N to create note from current content
          createNoteFromCurrentContent();
        } else {
          setIsCreatingNote(true);
        }
      }
      
      // Delete key to delete selected note
      if (e.key === 'Delete' && selectedNote && !isEditing) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this note?')) {
          deleteNote(selectedNote.id);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, isSplitMode, selectedNote]);
  
  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) { // Min 200px, Max 600px
        setSidebarWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'note' | 'folder', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent
    e.dataTransfer.dropEffect = 'move';
    setDragOver(targetId);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent
    setDragOver(null);
    
    if (!draggedItem) return;
    
    // Handle drop to root
    if (targetFolderId === 'root') {
      const targetFolder = folders.find(f => f.id === 'root');
      if (!targetFolder) return;
      
      try {
        setIsLoading(true);
        
        if (draggedItem.type === 'note') {
          // Move note to root
          const note = notes.find(n => n.id === draggedItem.id);
          if (note && note.path !== '') {
            // Move on Google Drive if signed in and both have Drive IDs
            if (isSignedIn && note.driveFileId && targetFolder.driveFolderId) {
              try {
                // Create new file in root folder
                const newDriveFileId = await driveService.uploadFile(`${note.title}.md`, note.content, targetFolder.driveFolderId);
                // Delete old file
                await driveService.deleteFile(note.driveFileId);
                
                // Update local note with new Drive ID and root path
                setNotes(prev => prev.map(n => 
                  n.id === draggedItem.id 
                    ? { ...n, path: '', driveFileId: newDriveFileId }
                    : n
                ));
              } catch (error) {
                console.error('Failed to move note to root on Drive:', error);
                // Still update locally even if Drive operation fails
                setNotes(prev => prev.map(n => 
                  n.id === draggedItem.id 
                    ? { ...n, path: '' }
                    : n
                ));
              }
            } else {
              // Update locally only
              setNotes(prev => prev.map(n => 
                n.id === draggedItem.id 
                  ? { ...n, path: '' }
                  : n
              ));
            }
          }
        } else if (draggedItem.type === 'folder') {
          // Move folder to root
          const folder = folders.find(f => f.id === draggedItem.id);
          if (folder && folder.parentId !== 'root') {
            const newPath = folder.name; // Root level path is just the folder name
            
            // Move on Google Drive if signed in and both have Drive IDs
            if (isSignedIn && folder.driveFolderId && targetFolder.driveFolderId) {
              try {
                // Create new folder in root
                const newDriveFolderId = await driveService.createFolder(folder.name, targetFolder.driveFolderId);
                
                // Move all files in the folder
                const notesToMove = notes.filter(n => n.path === folder.path);
                for (const note of notesToMove) {
                  if (note.driveFileId) {
                    const newNoteFileId = await driveService.uploadFile(`${note.title}.md`, note.content, newDriveFolderId);
                    await driveService.deleteFile(note.driveFileId);
                    
                    // Update note with new Drive ID and path
                    setNotes(prev => prev.map(n => 
                      n.id === note.id 
                        ? { ...n, path: newPath, driveFileId: newNoteFileId }
                        : n
                    ));
                  }
                }
                
                // Delete old folder on Drive
                await driveService.deleteFile(folder.driveFolderId);
                
                // Update folder with new Drive ID and path
                setFolders(prev => prev.map(f => {
                  if (f.id === draggedItem.id) {
                    return { ...f, parentId: 'root', path: newPath, driveFolderId: newDriveFolderId };
                  }
                  if (f.path.startsWith(folder.path + '/')) {
                    const relativePath = f.path.substring(folder.path.length + 1);
                    return { ...f, path: `${newPath}/${relativePath}` };
                  }
                  return f;
                }));
                
                // Update remaining notes in moved subfolders
                setNotes(prev => prev.map(n => {
                  if (n.path.startsWith(folder.path + '/')) {
                    const relativePath = n.path.substring(folder.path.length + 1);
                    return { ...n, path: `${newPath}/${relativePath}` };
                  }
                  return n;
                }));
                
              } catch (error) {
                console.error('Failed to move folder to root on Drive:', error);
                // Still update locally even if Drive operation fails
                updateFolderLocallyToRoot();
              }
            } else {
              // Update locally only
              updateFolderLocallyToRoot();
            }
            
            function updateFolderLocallyToRoot() {
              if (!folder || !draggedItem) return;
              
              // Update folder and its children
              setFolders(prev => prev.map(f => {
                if (f.id === draggedItem.id) {
                  return { ...f, parentId: 'root', path: newPath };
                }
                if (f.path.startsWith(folder.path + '/')) {
                  const relativePath = f.path.substring(folder.path.length + 1);
                  return { ...f, path: `${newPath}/${relativePath}` };
                }
                return f;
              }));
              
              // Update notes in moved folders
              setNotes(prev => prev.map(n => {
                if (n.path === folder.path) {
                  return { ...n, path: newPath };
                }
                if (n.path.startsWith(folder.path + '/')) {
                  const relativePath = n.path.substring(folder.path.length + 1);
                  return { ...n, path: `${newPath}/${relativePath}` };
                }
                return n;
              }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to move item to root:', error);
      } finally {
        setDraggedItem(null);
        setIsLoading(false);
      }
      return;
    }
    
    // Handle drop to specific folder (existing logic)
    const targetFolder = folders.find(f => f.id === targetFolderId);
    if (!targetFolder) return;
    
    try {
      setIsLoading(true);
      
      if (draggedItem.type === 'note') {
        // Move note to new folder
        const note = notes.find(n => n.id === draggedItem.id);
        if (note && note.path !== targetFolder.path) {
          // Move on Google Drive if signed in and both have Drive IDs
          if (isSignedIn && note.driveFileId && targetFolder.driveFolderId) {
            try {
              // Create new file in target folder
              const newDriveFileId = await driveService.uploadFile(`${note.title}.md`, note.content, targetFolder.driveFolderId);
              // Delete old file
              await driveService.deleteFile(note.driveFileId);
              
              // Update local note with new Drive ID
              setNotes(prev => prev.map(n => 
                n.id === draggedItem.id 
                  ? { ...n, path: targetFolder.path, driveFileId: newDriveFileId }
                  : n
              ));
            } catch (error) {
              console.error('Failed to move note on Drive:', error);
              // Still update locally even if Drive operation fails
              setNotes(prev => prev.map(n => 
                n.id === draggedItem.id 
                  ? { ...n, path: targetFolder.path }
                  : n
              ));
            }
          } else {
            // Update locally only
            setNotes(prev => prev.map(n => 
              n.id === draggedItem.id 
                ? { ...n, path: targetFolder.path }
                : n
            ));
          }
        }
      } else if (draggedItem.type === 'folder') {
        // Move folder to new parent
        const folder = folders.find(f => f.id === draggedItem.id);
        if (folder && folder.parentId !== targetFolderId && targetFolderId !== draggedItem.id) {
          const newPath = targetFolder.path ? `${targetFolder.path}/${folder.name}` : folder.name;
          
          // Move on Google Drive if signed in and both have Drive IDs
          if (isSignedIn && folder.driveFolderId && targetFolder.driveFolderId) {
            try {
              // Create new folder in target location
              const newDriveFolderId = await driveService.createFolder(folder.name, targetFolder.driveFolderId);
              
              // Move all files in the folder
              const notesToMove = notes.filter(n => n.path === folder.path);
              for (const note of notesToMove) {
                if (note.driveFileId) {
                  const newNoteFileId = await driveService.uploadFile(`${note.title}.md`, note.content, newDriveFolderId);
                  await driveService.deleteFile(note.driveFileId);
                  
                  // Update note with new Drive ID and path
                  setNotes(prev => prev.map(n => 
                    n.id === note.id 
                      ? { ...n, path: newPath, driveFileId: newNoteFileId }
                      : n
                  ));
                }
              }
              
              // Delete old folder on Drive
              await driveService.deleteFile(folder.driveFolderId);
              
              // Update folder with new Drive ID and path
              setFolders(prev => prev.map(f => {
                if (f.id === draggedItem.id) {
                  return { ...f, parentId: targetFolderId, path: newPath, driveFolderId: newDriveFolderId };
                }
                if (f.path.startsWith(folder.path + '/')) {
                  const relativePath = f.path.substring(folder.path.length + 1);
                  return { ...f, path: `${newPath}/${relativePath}` };
                }
                return f;
              }));
              
              // Update remaining notes in moved subfolders
              setNotes(prev => prev.map(n => {
                if (n.path.startsWith(folder.path + '/')) {
                  const relativePath = n.path.substring(folder.path.length + 1);
                  return { ...n, path: `${newPath}/${relativePath}` };
                }
                return n;
              }));
              
            } catch (error) {
              console.error('Failed to move folder on Drive:', error);
              // Still update locally even if Drive operation fails
              updateFolderLocally();
            }
          } else {
            // Update locally only
            updateFolderLocally();
          }
          
          function updateFolderLocally() {
            if (!folder || !draggedItem) return;
            
            // Update folder and its children
            setFolders(prev => prev.map(f => {
              if (f.id === draggedItem.id) {
                return { ...f, parentId: targetFolderId, path: newPath };
              }
              if (f.path.startsWith(folder.path + '/')) {
                const relativePath = f.path.substring(folder.path.length + 1);
                return { ...f, path: `${newPath}/${relativePath}` };
              }
              return f;
            }));
            
            // Update notes in moved folders
            setNotes(prev => prev.map(n => {
              if (n.path === folder.path) {
                return { ...n, path: newPath };
              }
              if (n.path.startsWith(folder.path + '/')) {
                const relativePath = n.path.substring(folder.path.length + 1);
                return { ...n, path: `${newPath}/${relativePath}` };
              }
              return n;
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to move item:', error);
    } finally {
      setDraggedItem(null);
      setIsLoading(false);
    }
  };

  const syncWithDrive = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      const notesFolderId = await driveService.findOrCreateNotesFolder();
      
      setSyncProgress(30);
      // Update root folder with Drive ID if not already set
      setFolders(prev => prev.map(folder => 
        folder.id === 'root' && !folder.driveFolderId
          ? { ...folder, driveFolderId: notesFolderId }
          : folder
      ));

      setSyncProgress(50);
      // Only load from Drive if we haven't synced yet
      if (!hasSyncedWithDrive) {
        await loadFromDrive(notesFolderId, '');
        setSyncProgress(90);
        setHasSyncedWithDrive(true);
      }
      setSyncProgress(100);
    } catch (error) {
      console.error('Failed to sync with Drive:', error);
    } finally {
      setIsLoading(false);
      setSyncProgress(0);
    }
  }, [hasSyncedWithDrive]); // loadFromDrive is defined below, using internal function

  const loadFromDrive = async (parentDriveId: string, parentPath: string) => {
    try {
      const files = await driveService.listFiles(parentDriveId);
      
      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // It's a folder
          const folderPath = parentPath ? `${parentPath}/${file.name}` : file.name;
          
          // Check if folder already exists using callback to get latest state
          setFolders(prevFolders => {
            const existingFolder = prevFolders.find(f => f.driveFolderId === file.id);
            
            if (!existingFolder) {
              const newFolder: Folder = {
                id: Date.now().toString() + Math.random(),
                name: file.name,
                path: folderPath,
                parentId: prevFolders.find(f => f.driveFolderId === parentDriveId)?.id || 'root',
                driveFolderId: file.id,
                expanded: false
              };
              
              return [...prevFolders, newFolder];
            }
            return prevFolders; // No change if folder already exists
          });
          
          // Recursively load subfolders
          await loadFromDrive(file.id, folderPath);
        } else if (file.name.endsWith('.md')) {
          // It's a markdown file
          const notePath = parentPath;
          
          // Check if note already exists using callback to get latest state
          setNotes(prevNotes => {
            const existingNote = prevNotes.find(n => n.driveFileId === file.id);
            
            if (!existingNote) {
              // Load content and create new note
              driveService.getFile(file.id).then(content => {
                const newNote: Note = {
                  id: Date.now().toString() + Math.random(),
                  title: file.name.replace('.md', ''),
                  content: content,
                  path: notePath,
                  driveFileId: file.id,
                  createdAt: file.createdTime,
                  updatedAt: file.modifiedTime
                };
                
                setNotes(currentNotes => {
                  // Double check to avoid race condition
                  const stillNotExists = !currentNotes.find(n => n.driveFileId === file.id);
                  if (stillNotExists) {
                    return [...currentNotes, newNote];
                  }
                  return currentNotes;
                });
              }).catch(error => {
                console.error('Failed to load file content:', error);
              });
            }
            return prevNotes; // No immediate change
          });
        }
      }
    } catch (error) {
      console.error('Failed to load from Drive:', error);
    }
  };

  const toggleFolder = (folderId: string) => {
    setFolders(folders.map(folder => 
      folder.id === folderId 
        ? { ...folder, expanded: !folder.expanded }
        : folder
    ));
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setIsLoading(true);
      
      const parentFolder = folders.find(f => f.path === selectedPath);
      const parentDriveId = parentFolder?.driveFolderId;
      
      let driveFolderId;
      if (isSignedIn && parentDriveId) {
        driveFolderId = await driveService.createFolder(newFolderName, parentDriveId);
      }
      
      const newFolder: Folder = {
        id: Date.now().toString(),
        name: newFolderName,
        path: selectedPath ? `${selectedPath}/${newFolderName}` : newFolderName,
        parentId: parentFolder?.id || 'root',
        driveFolderId: driveFolderId,
        expanded: false
      };
      
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNoteName.trim()) return;
    
    try {
      setIsLoading(true);
      
      const parentFolder = folders.find(f => f.path === selectedPath);
      const parentDriveId = parentFolder?.driveFolderId;
      
      const initialContent = `# ${newNoteName}

Start writing your note here...

## Features Supported

- **Bold text** and *italic text*
- [Links](https://example.com)
- \`inline code\`
- Lists and checkboxes
- Tables
- Blockquotes
- **LaTeX Math Support**
- And much more!

## Task Lists / Checkboxes

You can create interactive checkboxes that can be toggled:

- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task
- [x] Another checked task

### Project Tasks Example

- [ ] Research project requirements
- [x] Set up development environment
- [ ] Implement core features
  - [x] User authentication
  - [ ] Data persistence
  - [ ] API integration
- [ ] Write documentation
- [ ] Deploy to production

## Math Examples

### Inline Math
Here's an inline math example: $E = mc^2$ and another one $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

### Display Math
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$

$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}$$

## Code Example

\`\`\`javascript
console.log("Hello World!");
\`\`\`

## Table Example

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

> This is a blockquote example. Great for highlighting important information.

## More Math

Complex equations work too:

$$f(x) = \\int_{-\\infty}^x e^{-t^2} dt$$

$$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e$$`;
      
      let driveFileId;
      if (isSignedIn && parentDriveId) {
        driveFileId = await driveService.uploadFile(`${newNoteName}.md`, initialContent, parentDriveId);
      }
      
      const newNote: Note = {
        id: Date.now().toString(),
        title: newNoteName,
        content: initialContent,
        path: selectedPath,
        driveFileId: driveFileId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setNotes([...notes, newNote]);
      setSelectedNote(newNote);
      setNewNoteName('');
      setIsCreatingNote(false);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create note from current content
  const createNoteFromCurrentContent = async () => {
    const title = selectedNote ? `${selectedNote.title} - Copy` : 'New Note';
    const content = isEditing ? editContent : (selectedNote?.content || '');
    
    try {
      setIsLoading(true);
      
      const parentFolder = folders.find(f => f.path === selectedPath);
      const parentDriveId = parentFolder?.driveFolderId;
      
      let driveFileId: string | undefined;
      
      if (isSignedIn && parentDriveId) {
        driveFileId = await driveService.uploadFile(
          title + '.md',
          content,
          parentDriveId
        );
      }
      
      const newNote: Note = {
        id: Date.now().toString(),
        title,
        content,
        path: selectedPath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driveFileId
      };

      setNotes([...notes, newNote]);
      setSelectedNote(newNote);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
    } catch (error) {
      console.error('Failed to create note from current content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    
    try {
      setIsLoading(true);
      
      let updatedNote = {
        ...selectedNote,
        title: editTitle,
        content: editContent,
        updatedAt: new Date().toISOString()
      };
      
      // Update in Drive if signed in
      if (isSignedIn) {
        try {
          if (selectedNote.driveFileId) {
            // Try to update existing file
            await driveService.updateFile(selectedNote.driveFileId, editContent);
          } else {
            // No Drive file ID, create new file
            const parentFolder = folders.find(f => f.path === selectedNote.path);
            const parentDriveId = parentFolder?.driveFolderId;
            
            if (parentDriveId) {
              const newDriveFileId = await driveService.uploadFile(`${editTitle}.md`, editContent, parentDriveId);
              updatedNote = { ...updatedNote, driveFileId: newDriveFileId };
            }
          }
        } catch (driveError: unknown) {
          console.error('Drive error:', driveError);
          
          // If file not found (404), create new file
          const error = driveError as { status?: number; result?: { error?: { code?: number } } };
          if (error.status === 404 || (error.result?.error?.code === 404)) {
            console.log('File not found on Drive, creating new file...');
            
            const parentFolder = folders.find(f => f.path === selectedNote.path);
            const parentDriveId = parentFolder?.driveFolderId;
            
            if (parentDriveId) {
              try {
                const newDriveFileId = await driveService.uploadFile(`${editTitle}.md`, editContent, parentDriveId);
                updatedNote = { ...updatedNote, driveFileId: newDriveFileId };
                console.log('Created new file with ID:', newDriveFileId);
              } catch (createError) {
                console.error('Failed to create new file:', createError);
                // Remove the invalid driveFileId
                updatedNote = { ...updatedNote, driveFileId: undefined };
              }
            } else {
              // Remove the invalid driveFileId
              updatedNote = { ...updatedNote, driveFileId: undefined };
            }
          } else {
            // Other Drive errors, remove the invalid driveFileId
            updatedNote = { ...updatedNote, driveFileId: undefined };
          }
        }
      }
      
      setNotes(notes.map(note => 
        note.id === selectedNote.id ? updatedNote : note
      ));
      setSelectedNote(updatedNote);
      setIsEditing(false);
      // Disable split mode when saving
      setIsSplitMode(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      setIsLoading(true);
      const note = notes.find(n => n.id === noteId);
      
      // Delete from Drive if signed in and has Drive file ID
      if (isSignedIn && note?.driveFileId) {
        await driveService.deleteFile(note.driveFileId);
      }
      
      setNotes(notes.filter(note => note.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFolder = async (folderId: string) => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete || folderId === 'root') return;
    
    try {
      setIsLoading(true);
      
      // Delete from Drive if signed in and has Drive folder ID
      if (isSignedIn && folderToDelete.driveFolderId) {
        await driveService.deleteFile(folderToDelete.driveFolderId);
      }
      
      // Delete all notes in this folder (and from Drive)
      const notesToDelete = notes.filter(note => note.path.startsWith(folderToDelete.path));
      for (const note of notesToDelete) {
        if (isSignedIn && note.driveFileId) {
          await driveService.deleteFile(note.driveFileId);
        }
      }
      
      setNotes(notes.filter(note => !note.path.startsWith(folderToDelete.path)));
      
      // Delete the folder and its subfolders
      setFolders(folders.filter(folder => 
        folder.id !== folderId && !folder.path.startsWith(folderToDelete.path + '/')
      ));
    } catch (error) {
      console.error('Failed to delete folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = () => {
    if (!selectedNote) return;
    setIsEditing(true);
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content);
    // Auto-enable split mode when starting to edit
    setIsSplitMode(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
    // Disable split mode when canceling
    setIsSplitMode(false);
  };

  // Scroll synchronization state for split mode (passed to components)
  const [isScrollingSynced, setIsScrollingSynced] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollSource = useRef<'raw' | 'preview' | null>(null);
  const scrollThrottleRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <AuthenticatedLayout>
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
          onToggleFolder={toggleFolder}
          onSelectNote={setSelectedNote}
          onSetSelectedPath={setSelectedPath}
          onSetIsCreatingFolder={setIsCreatingFolder}
          onSetIsCreatingNote={setIsCreatingNote}
          onDeleteFolder={deleteFolder}
          onDeleteNote={deleteNote}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onSetDragOver={setDragOver}
          onSetIsResizing={setIsResizing}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNote ? (
            <>
              {/* Note Header */}
              <div className="border-b border-gray-600 px-6 py-4 flex-shrink-0" style={{ backgroundColor: '#31363F' }}>
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-xl font-semibold bg-transparent text-white border-b border-gray-600 focus:outline-none focus:border-white"
                    />
                  ) : (
                    <h1 className="text-xl font-semibold text-white">{selectedNote.title}</h1>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    {/* Share Button */}
                    <ShareDropdown 
                      noteId={selectedNote.id} 
                      noteTitle={selectedNote.title}
                      noteContent={selectedNote.content}
                    />

                    {/* Split Mode Toggle */}
                    <button
                      onClick={() => setIsSplitMode(!isSplitMode)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                        isSplitMode 
                          ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/30' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                      title={`${isSplitMode ? 'Exit' : 'Enter'} Split Mode (Ctrl+Shift+S)`}
                    >
                      <Split size={16} />
                      <span className="hidden sm:inline">{isSplitMode ? 'Exit Split' : 'Split View'}</span>
                    </button>

                    {/* Settings Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="px-3 py-1 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-1"
                          title="Settings"
                        >
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm7.94-2.06c.04-.48.06-.97.06-1.44s-.02-.96-.06-1.44l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.03 7.03 0 0 0-1.25-.73l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.42l-.38 2.65c-.44.18-.86.4-1.25.73l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.48-.06.97-.06 1.44s.02.96.06 1.44l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.49-1c.39.33.81.55 1.25.73l.38 2.65A.5.5 0 0 0 10 22h4a.5.5 0 0 0 .5-.42l.38-2.65c.44-.18.86-.4 1.25-.73l2.49 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/></svg>
                        </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-[#31363F] border-gray-600 text-gray-300">
                          <DropdownMenuLabel>
                            Settings
                          </DropdownMenuLabel>
                          <DropdownMenuLabel>
                            <span className="mr-2">
                              Tab Size:
                            </span>
                            <select
                              value={tabSize}
                              onChange={e => setTabSize(Number(e.target.value))}
                              className="bg-gray-700 text-white rounded px-2 py-1 ml-2"
                            >
                              <option value={2}>
                                2
                              </option>
                              <option value={4}>
                                4
                              </option>
                              <option value={8}>
                                8
                              </option>
                            </select>
                          </DropdownMenuLabel>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {isEditing ? (
                        <>
                          <button
                          onClick={saveNote}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startEdit}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Last updated: {new Date(selectedNote.updatedAt).toLocaleString()}
                </p>
              </div>

              {/* Note Content */}
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="flex-1 overflow-hidden" style={{ backgroundColor: '#222831' }}>
                    {isEditing ? (
                      isSplitMode ? (
                        /* Split Mode: Raw + Preview */
                        <NoteSplitEditor
                          editContent={editContent}
                          setEditContent={setEditContent}
                          notes={notes}
                          selectedNote={selectedNote}
                          setNotes={setNotes}
                          setSelectedNote={setSelectedNote}
                          isSignedIn={isSignedIn}
                          driveService={driveService}
                          isScrollingSynced={isScrollingSynced}
                          setIsScrollingSynced={setIsScrollingSynced}
                          scrollTimeoutRef={scrollTimeoutRef}
                          scrollThrottleRef={scrollThrottleRef}
                          lastScrollSource={lastScrollSource}
                          tabSize={tabSize}
                        />
                      ) : (
                        /* Regular Edit Mode */
                        <NoteRegularEditor
                          editContent={editContent}
                          setEditContent={setEditContent}
                          tabSize={tabSize}
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
                      />
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64 bg-[#31363F] border-gray-600 text-gray-300">
                  <ContextMenuItem onClick={() => setIsEditing(!isEditing)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                    <Edit className="mr-2 h-4 w-4" />
                    {isEditing ? 'Preview Mode' : 'Edit Mode'}
                    <ContextMenuShortcut className="text-gray-400">Ctrl+E</ContextMenuShortcut>
                  </ContextMenuItem>
                  
                  {isEditing && (
                    <ContextMenuItem onClick={() => setIsSplitMode(!isSplitMode)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                      <Split className="mr-2 h-4 w-4" />
                      {isSplitMode ? 'Regular Editor' : 'Split Editor'}
                      <ContextMenuShortcut className="text-gray-400">Ctrl+\\</ContextMenuShortcut>
                    </ContextMenuItem>
                  )}
                  
                  <ContextMenuSeparator className="bg-gray-600" />
                  
                  <ContextMenuItem onClick={() => {
                    if (selectedNote) {
                      navigator.clipboard.writeText(selectedNote.content);
                    }
                  }} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                    <FileText className="mr-2 h-4 w-4" />
                    Copy Content
                    <ContextMenuShortcut className="text-gray-400">Ctrl+C</ContextMenuShortcut>
                  </ContextMenuItem>
                  
                  <ContextMenuItem onClick={() => {
                    if (selectedNote) {
                      const title = selectedNote.title || 'Untitled Note';
                      const content = selectedNote.content || '';
                      const fullText = `# ${title}\n\n${content}`;
                      navigator.clipboard.writeText(fullText);
                    }
                  }} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                    <FileText className="mr-2 h-4 w-4" />
                    Copy with Title
                    <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+C</ContextMenuShortcut>
                  </ContextMenuItem>
                  
                  {isEditing && (
                    <>
                      <ContextMenuSeparator className="bg-gray-600" />
                      <ContextMenuItem onClick={() => {
                        setEditContent('');
                      }} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                        <X className="mr-2 h-4 w-4" />
                        Clear Content
                      </ContextMenuItem>
                      
                      <ContextMenuItem onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          setEditContent(prev => prev + text);
                        } catch (err) {
                          console.error('Failed to read clipboard:', err);
                        }
                      }} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                        <FileText className="mr-2 h-4 w-4" />
                        Paste
                        <ContextMenuShortcut className="text-gray-400">Ctrl+V</ContextMenuShortcut>
                      </ContextMenuItem>
                    </>
                  )}
                  
                  <ContextMenuSeparator className="bg-gray-600" />
                  
                  <ContextMenuItem onClick={() => setIsCreatingNote(true)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                    <FileText className="mr-2 h-4 w-4" />
                    New Note
                    <ContextMenuShortcut className="text-gray-400">Ctrl+N</ContextMenuShortcut>
                  </ContextMenuItem>
                  
                  <ContextMenuItem onClick={createNoteFromCurrentContent} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                    <FileText className="mr-2 h-4 w-4" />
                    New Note from Current
                    <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+N</ContextMenuShortcut>
                  </ContextMenuItem>
                  
                  {selectedNote && (
                    <ContextMenuItem 
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this note?')) {
                          deleteNote(selectedNote.id);
                        }
                      }}
                      className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Delete Note
                      <ContextMenuShortcut className="text-gray-400">Del</ContextMenuShortcut>
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#222831' }}>
              <div className="text-center">
                <FileText size={64} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Select a note to start reading</p>
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
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#31363F', borderColor: '#4a5568' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Create New Folder</DialogTitle>
            <DialogDescription className="text-gray-400">
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
                  createFolder();
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
              onClick={createFolder}
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
            <DialogDescription className="text-gray-400">
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
                  createNote();
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
              onClick={createNote}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  );
}
