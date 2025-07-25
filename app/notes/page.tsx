'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import { FileText, Plus, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown, Edit, Trash2, Save, X, Cloud, CloudOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDrive } from '../lib/driveContext';
import { driveService } from '../lib/googleDrive';
import '../lib/types';

interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  driveFileId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  driveFolderId?: string;
  expanded?: boolean;
}

export default function NotesPage() {
  const { isSignedIn } = useDrive();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'root', name: 'Notes', path: '', expanded: true }
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
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, type: 'note' | 'folder' | 'empty', id?: string} | null>(null);
  
  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  
  // Track if we've already synced with Drive
  const [hasSyncedWithDrive, setHasSyncedWithDrive] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes-drive');
    const savedFolders = localStorage.getItem('folders-new');
    const savedSidebarWidth = localStorage.getItem('sidebar-width');
    const savedHasSynced = localStorage.getItem('has-synced-drive');
    
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
    
    if (savedFolders) {
      setFolders(JSON.parse(savedFolders));
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
  }, [isSignedIn]);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('notes-new', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('folders-new', JSON.stringify(folders));
  }, [folders]);
  
  // Save sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);
  
  // Save sync status to localStorage
  useEffect(() => {
    localStorage.setItem('has-synced-drive', JSON.stringify(hasSyncedWithDrive));
  }, [hasSyncedWithDrive]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
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

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, type: 'note' | 'folder' | 'empty', id?: string) => {
    e.preventDefault();
    
    // Set selectedPath based on context menu target
    if (type === 'folder' && id) {
      const folder = folders.find(f => f.id === id);
      if (folder) {
        setSelectedPath(folder.path);
      }
    } else if (type === 'empty') {
      setSelectedPath(''); // Root level
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      id
    });
  };

  const syncWithDrive = async () => {
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
  };

  const loadFromDrive = async (parentDriveId: string, parentPath: string) => {
    try {
      const files = await driveService.listFiles(parentDriveId);
      
      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // It's a folder
          const folderPath = parentPath ? `${parentPath}/${file.name}` : file.name;
          const existingFolder = folders.find(f => f.driveFolderId === file.id);
          
          if (!existingFolder) {
            const newFolder: Folder = {
              id: Date.now().toString() + Math.random(),
              name: file.name,
              path: folderPath,
              parentId: folders.find(f => f.driveFolderId === parentDriveId)?.id || 'root',
              driveFolderId: file.id,
              expanded: false
            };
            
            setFolders(prev => [...prev, newFolder]);
          }
          
          // Recursively load subfolders
          await loadFromDrive(file.id, folderPath);
        } else if (file.name.endsWith('.md')) {
          // It's a markdown file
          const notePath = parentPath;
          const existingNote = notes.find(n => n.driveFileId === file.id);
          
          if (!existingNote) {
            const content = await driveService.getFile(file.id);
            const newNote: Note = {
              id: Date.now().toString() + Math.random(),
              title: file.name.replace('.md', ''),
              content: content,
              path: notePath,
              driveFileId: file.id,
              createdAt: file.createdTime,
              updatedAt: file.modifiedTime
            };
            
            setNotes(prev => [...prev, newNote]);
          }
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
- And much more!

## Code Example

\`\`\`javascript
console.log("Hello World!");
\`\`\`

## Table Example

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

> This is a blockquote example. Great for highlighting important information.`;
      
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
        } catch (driveError: any) {
          console.error('Drive error:', driveError);
          
          // If file not found (404), create new file
          if (driveError.status === 404 || (driveError.result && driveError.result.error && driveError.result.error.code === 404)) {
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
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
  };

  const getNotesInPath = (path: string) => {
    return notes.filter(note => note.path === path);
  };

  const getSubfolders = (parentPath: string) => {
    return folders.filter(folder => {
      if (parentPath === '') {
        return folder.parentId === 'root' && folder.id !== 'root';
      }
      return folder.path.startsWith(parentPath + '/') && 
             folder.path.split('/').length === parentPath.split('/').length + 1;
    });
  };

  // Optimized markdown rendering - memoized to prevent re-renders on large files
  const memoizedMarkdown = useMemo(() => {
    if (!selectedNote || isEditing) return null;
    
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml={true} // Security: skip HTML for performance
        components={{
          // Optimized headers
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-bold text-white mb-6 mt-8 border-b border-gray-600 pb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-semibold text-white mb-4 mt-6" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-semibold text-white mb-3 mt-5" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-lg font-medium text-white mb-2 mt-4" {...props}>
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 className="text-base font-medium text-white mb-2 mt-3" {...props}>
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 className="text-sm font-medium text-gray-300 mb-2 mt-3" {...props}>
              {children}
            </h6>
          ),
          // Optimized paragraphs
          p: ({ children, ...props }) => (
            <p className="mb-4 text-gray-300 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          // Code blocks with syntax highlighting
          code: ({ children, className, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            return isInline ? (
              <code className="bg-gray-700 text-pink-300 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-gray-800 border border-gray-600 rounded-lg p-4 my-4 overflow-x-auto">
                <code className={`text-sm font-mono text-gray-300 ${className}`} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside mb-4 text-gray-300 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside mb-4 text-gray-300 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-gray-300" {...props}>{children}</li>
          ),
          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4 bg-gray-800 bg-opacity-30 py-2" {...props}>
              {children}
            </blockquote>
          ),
          // Links
          a: ({ children, href, ...props }) => (
            <a 
              href={href} 
              className="text-blue-400 hover:text-blue-300 underline transition-colors" 
              target="_blank" 
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Bold and italic
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-white" {...props}>{children}</strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-gray-300" {...props}>{children}</em>
          ),
          // Tables (GitHub Flavored Markdown)
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-600 rounded-lg" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-gray-700" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="bg-gray-800" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="border-b border-gray-600" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-2 text-left text-white font-semibold border-r border-gray-600 last:border-r-0" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2 text-gray-300 border-r border-gray-600 last:border-r-0" {...props}>
              {children}
            </td>
          ),
          // Horizontal rule
          hr: ({ ...props }) => (
            <hr className="border-gray-600 my-8" {...props} />
          ),
          // Strikethrough (GitHub Flavored Markdown)
          del: ({ children, ...props }) => (
            <del className="line-through text-gray-400" {...props}>{children}</del>
          ),
        }}
      >
        {selectedNote.content}
      </ReactMarkdown>
    );
  }, [selectedNote?.content, selectedNote?.id, isEditing]);

  const renderFileTree = (parentPath: string = '', level: number = 0) => {
    const subfolders = getSubfolders(parentPath);
    const notesInPath = getNotesInPath(parentPath);
    
    return (
      <div className={level > 0 ? 'ml-4' : ''}>
        {/* Render subfolders */}
        {subfolders.map(folder => (
          <div key={folder.id} className="mb-1">
            <div 
              className={`flex items-center px-2 py-1 hover:bg-gray-700 rounded cursor-pointer group ${
                dragOver === folder.id ? 'bg-blue-600 bg-opacity-30' : ''
              }`}
              draggable={folder.id !== 'root'}
              onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
              onContextMenu={(e) => {
                e.stopPropagation();
                handleContextMenu(e, 'folder', folder.id);
              }}
              onClick={() => {
                toggleFolder(folder.id);
                setSelectedPath(folder.path);
              }}
            >
              {folder.expanded ? (
                <ChevronDown size={16} className="text-gray-400 mr-1" />
              ) : (
                <ChevronRight size={16} className="text-gray-400 mr-1" />
              )}
              {folder.expanded ? (
                <FolderOpen size={16} className="text-blue-400 mr-2" />
              ) : (
                <Folder size={16} className="text-blue-400 mr-2" />
              )}
              <span className="text-gray-300 text-sm flex-1">{folder.name}</span>
              {folder.driveFolderId && (
                <Cloud size={12} className="text-green-400 mr-1" />
              )}
            </div>
            {folder.expanded && renderFileTree(folder.path, level + 1)}
          </div>
        ))}
        
        {/* Render notes */}
        {notesInPath.map(note => (
          <div 
            key={note.id}
            className={`flex items-center px-2 py-1 hover:bg-gray-700 rounded cursor-pointer group ${
              selectedNote?.id === note.id ? 'bg-gray-700' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, 'note', note.id)}
            onContextMenu={(e) => {
              e.stopPropagation();
              handleContextMenu(e, 'note', note.id);
            }}
            onClick={() => setSelectedNote(note)}
          >
            <div className="w-4 mr-1"></div>
            <FileText size={16} className="text-gray-400 mr-2" />
            <span className="text-gray-300 text-sm flex-1 truncate">{note.title}</span>
            {note.driveFileId && (
              <Cloud size={12} className="text-green-400 mr-1" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#222831' }}>
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer Sidebar */}
        <div 
          className={`border-r border-gray-600 flex flex-col overflow-hidden relative ${
            dragOver === 'root' ? 'bg-blue-600 bg-opacity-10' : ''
          }`}
          style={{ 
            width: `${sidebarWidth}px`,
            backgroundColor: dragOver === 'root' ? '#1e40af20' : '#31363F' 
          }}
          onContextMenu={(e) => handleContextMenu(e, 'empty')}
        >
          <div className="px-4 py-3 border-b border-gray-600 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">
              Notes
            </h2>
            
            {!isSignedIn && (
              <div className="text-xs text-yellow-400 mt-2">
                💡 Sign in to Google Drive to sync notes
              </div>
            )}
            
            {isLoading && (
              <div className="text-xs text-blue-400 mt-2">
                Syncing {syncProgress}%...
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4"
            onDragOver={(e) => {
              e.preventDefault();
              // Only set to root if we're not over a specific folder
              if (e.target === e.currentTarget) {
                setDragOver('root');
              }
            }}
            onDragLeave={(e) => {
              // Only clear if we're leaving the container itself
              if (e.target === e.currentTarget) {
                setDragOver(null);
              }
            }}
            onDrop={(e) => {
              // Only handle drop to root if we're dropping on empty space
              if (e.target === e.currentTarget) {
                handleDrop(e, 'root');
              }
            }}
          >
            {renderFileTree()}
          </div>
          
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors"
            onMouseDown={() => setIsResizing(true)}
            title="Drag to resize sidebar"
          />
        </div>

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
              <div className="flex-1 px-20 py-6 overflow-y-auto" style={{ backgroundColor: '#222831' }}>
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full resize-none bg-transparent text-gray-300 focus:outline-none font-mono text-sm"
                    placeholder="Write your note in Markdown..."
                  />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    {memoizedMarkdown}
                  </div>
                )}
              </div>
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

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'empty' && (
            <>
              <button
                onClick={() => {
                  setIsCreatingFolder(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
              >
                <FolderPlus size={16} className="mr-2" />
                New Folder
              </button>
              <button
                onClick={() => {
                  setIsCreatingNote(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
              >
                <FileText size={16} className="mr-2" />
                New Note
              </button>
            </>
          )}
          
          {(contextMenu.type === 'folder') && (
            <>
              <button
                onClick={() => {
                  setIsCreatingFolder(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
              >
                <FolderPlus size={16} className="mr-2" />
                New Folder
              </button>
              <button
                onClick={() => {
                  setIsCreatingNote(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
              >
                <FileText size={16} className="mr-2" />
                New Note
              </button>
              {contextMenu.id !== 'root' && (
                <>
                  <hr className="border-gray-600 my-1" />
                  <button
                    onClick={() => {
                      deleteFolder(contextMenu.id!);
                      setContextMenu(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Folder
                  </button>
                </>
              )}
            </>
          )}
          
          {contextMenu.type === 'note' && (
            <>
              <button
                onClick={() => {
                  const note = notes.find(n => n.id === contextMenu.id);
                  if (note) setSelectedNote(note);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center"
              >
                <Edit size={16} className="mr-2" />
                Open Note
              </button>
              <hr className="border-gray-600 my-1" />
              <button
                onClick={() => {
                  deleteNote(contextMenu.id!);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Note
              </button>
            </>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-96 shadow-xl border border-gray-600" style={{ backgroundColor: '#31363F' }}>
            <h3 className="text-lg font-semibold text-white mb-2">Create New Folder</h3>
            {selectedPath ? (
              <p className="text-sm text-gray-400 mb-4">📁 Creating in: /{selectedPath}</p>
            ) : (
              <p className="text-sm text-gray-400 mb-4">📁 Creating in: Root</p>
            )}
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#222831' }}
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
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
            </div>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {isCreatingNote && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-lg p-6 w-96 shadow-xl border border-gray-600" style={{ backgroundColor: '#31363F' }}>
            <h3 className="text-lg font-semibold text-white mb-2">Create New Note</h3>
            {selectedPath ? (
              <p className="text-sm text-gray-400 mb-4">📝 Creating in: /{selectedPath}</p>
            ) : (
              <p className="text-sm text-gray-400 mb-4">📝 Creating in: Root</p>
            )}
            <input
              type="text"
              value={newNoteName}
              onChange={(e) => setNewNoteName(e.target.value)}
              placeholder="Note title"
              className="w-full px-3 py-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#222831' }}
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
