import React, { useCallback } from 'react';
import { useDrive } from '../../../../lib/driveContext';
import { driveService } from '../../../../lib/googleDrive';
import { Note, Folder } from '../../components/types';

export const useDragAndDrop = (
  notes: Note[],
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
  folders: Folder[],
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>,
  setIsLoading: (loading: boolean) => void,
  setSyncProgress: (progress: number) => void,
  selectedNote: Note | null,
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>
) => {
  const { isSignedIn } = useDrive();

  const handleDragStart = useCallback((e: React.DragEvent, type: 'note' | 'folder', id: string) => {
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (
    e: React.DragEvent, 
    targetFolderId: string, 
    draggedItem: { type: 'note' | 'folder', id: string } | null,
    setDraggedItem: (item: { type: 'note' | 'folder', id: string } | null) => void,
    setDragOver: (id: string | null) => void,
    newTitle?: string
  ) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to parent
    setDragOver(null);

    if (!draggedItem) return;

    // Start progress
    try { setSyncProgress(10); } catch {}

    // Handle drop to root
  if (targetFolderId === 'root') {
      const targetFolder = folders.find(f => f.id === 'root');
      if (!targetFolder) return;

      try {
        setIsLoading(true);
        setSyncProgress(20);

    if (draggedItem.type === 'note') {
          // Move note to root
          const note = notes.find(n => n.id === draggedItem.id);
          if (note && note.path !== '') {
      const finalTitle = newTitle && newTitle.trim() ? newTitle.trim() : note.title;
            // Move on Google Drive if signed in and both have Drive IDs
            if (isSignedIn && note.driveFileId && targetFolder.driveFolderId) {
              try {
                setSyncProgress(35);
                // Move existing file to root parent; keep same ID
                await driveService.moveFile(note.driveFileId, targetFolder.driveFolderId);
                setSyncProgress(70);

                // Update local note with new path
                const updated = { ...note, title: finalTitle, path: '' } as Note;
                setNotes(prev => prev.map(n => n.id === draggedItem.id ? updated : n));
                if (selectedNote?.id === note.id) setSelectedNote(updated);
                setSyncProgress(90);
              } catch (error) {
                console.error('Failed to move note to root on Drive:', error);
                // Still update locally even if Drive operation fails
                const updated = { ...note, title: finalTitle, path: '' } as Note;
                setNotes(prev => prev.map(n => n.id === draggedItem.id ? updated : n));
                if (selectedNote?.id === note.id) setSelectedNote(updated);
                setSyncProgress(80);
              }
            } else {
              // Update locally only
              const updated = { ...note, title: finalTitle, path: '' } as Note;
              setNotes(prev => prev.map(n => n.id === draggedItem.id ? updated : n));
              if (selectedNote?.id === note.id) setSelectedNote(updated);
              setSyncProgress(80);
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
                setSyncProgress(40);
                // Move the folder itself; children follow implicitly
                await driveService.moveFile(folder.driveFolderId, targetFolder.driveFolderId);
                setSyncProgress(70);

                // Update folder path locally
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

                // Update remaining notes in moved subfolders
                setNotes(prev => prev.map(n => {
                  if (n.path.startsWith(folder.path + '/')) {
                    const relativePath = n.path.substring(folder.path.length + 1);
                    return { ...n, path: `${newPath}/${relativePath}` } as Note;
                  }
                  return n;
                }));
                if (selectedNote && selectedNote.path.startsWith(folder.path)) {
                  const relativePath = selectedNote.path === folder.path
                    ? ''
                    : selectedNote.path.substring(folder.path.length + 1);
                  const newSelPath = relativePath ? `${newPath}/${relativePath}` : newPath;
                  setSelectedNote({ ...selectedNote, path: newSelPath });
                }
                setSyncProgress(95);

              } catch (error) {
                console.error('Failed to move folder to root on Drive:', error);
                // Still update locally even if Drive operation fails
                updateFolderLocallyToRoot();
                setSyncProgress(90);
              }
            } else {
              // Update locally only
              updateFolderLocallyToRoot();
              setSyncProgress(85);
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
              let updatedSelectedLocal: Note | null = null;
              setNotes(prev => prev.map(n => {
                if (n.path === folder.path) {
                  const updated = { ...n, path: newPath } as Note;
                  if (selectedNote?.id === n.id) updatedSelectedLocal = updated;
                  return updated;
                }
                if (n.path.startsWith(folder.path + '/')) {
                  const relativePath = n.path.substring(folder.path.length + 1);
                  const updated = { ...n, path: `${newPath}/${relativePath}` } as Note;
                  if (selectedNote?.id === n.id) updatedSelectedLocal = updated;
                  return updated;
                }
                return n;
              }));
              if (updatedSelectedLocal) setSelectedNote(updatedSelectedLocal);
            }
          }
        }
        setSyncProgress(100);
        setTimeout(() => setSyncProgress(0), 500);
      } catch (error) {
        console.error('Failed to move item to root:', error);
      } finally {
        setDraggedItem(null);
        // small delay to let 100% be visible
        setTimeout(() => setIsLoading(false), 500);
      }
      return;
    }

    // Handle drop to specific folder (existing logic)
    const targetFolder = folders.find(f => f.id === targetFolderId);
    if (!targetFolder) return;

    try {
      setIsLoading(true);
      setSyncProgress(20);

    if (draggedItem.type === 'note') {
        // Move note to new folder
        const note = notes.find(n => n.id === draggedItem.id);
        if (note && note.path !== targetFolder.path) {
      const finalTitle = newTitle && newTitle.trim() ? newTitle.trim() : note.title;
          // Move on Google Drive if signed in and both have Drive IDs
          if (isSignedIn && note.driveFileId && targetFolder.driveFolderId) {
            try {
              setSyncProgress(35);
              // Move file to new parent; keep same ID
              await driveService.moveFile(note.driveFileId, targetFolder.driveFolderId);
              setSyncProgress(70);

              // Update local note path/title only
              const updated = { ...note, title: finalTitle, path: targetFolder.path } as Note;
              setNotes(prev => prev.map(n => n.id === draggedItem.id ? updated : n));
              if (selectedNote?.id === note.id) setSelectedNote(updated);
              setSyncProgress(90);
            } catch (error) {
              console.error('Failed to move note on Drive:', error);
              // Still update locally even if Drive operation fails
              const updated = { ...note, title: finalTitle, path: targetFolder.path } as Note;
              setNotes(prev => prev.map(n => n.id === draggedItem.id ? updated : n));
              if (selectedNote?.id === note.id) setSelectedNote(updated);
              setSyncProgress(85);
            }
          } else {
            // Update locally only
            const updated = { ...note, title: finalTitle, path: targetFolder.path } as Note;
            setNotes(prev => prev.map(n => n.id === draggedItem.id ? updated : n));
            if (selectedNote?.id === note.id) setSelectedNote(updated);
            setSyncProgress(85);
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
              setSyncProgress(40);
              // Move the folder itself; children follow implicitly
              await driveService.moveFile(folder.driveFolderId, targetFolder.driveFolderId);
              setSyncProgress(70);

              // Update folder path locally
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

              // Update remaining notes in moved subfolders
              setNotes(prev => prev.map(n => {
                if (n.path.startsWith(folder.path + '/')) {
                  const relativePath = n.path.substring(folder.path.length + 1);
                  return { ...n, path: `${newPath}/${relativePath}` } as Note;
                }
                return n;
              }));
              if (selectedNote && selectedNote.path.startsWith(folder.path)) {
                const relativePath = selectedNote.path === folder.path
                  ? ''
                  : selectedNote.path.substring(folder.path.length + 1);
                const newSelPath = relativePath ? `${newPath}/${relativePath}` : newPath;
                setSelectedNote({ ...selectedNote, path: newSelPath });
              }
              setSyncProgress(95);

            } catch (error) {
              console.error('Failed to move folder on Drive:', error);
              // Still update locally even if Drive operation fails
              updateFolderLocally();
              setSyncProgress(90);
            }
          } else {
            // Update locally only
            updateFolderLocally();
            setSyncProgress(85);
          }

          function updateFolderLocally() {
            if (!folder || !draggedItem) return;

            // Update folder and its children
            let updatedSelectedLocal: Note | null = null;
            setNotes(prev => prev.map(n => {
              if (n.path === folder.path) {
                const updated = { ...n, path: newPath } as Note;
                if (selectedNote?.id === n.id) updatedSelectedLocal = updated;
                return updated;
              }
              if (n.path.startsWith(folder.path + '/')) {
                const relativePath = n.path.substring(folder.path.length + 1);
                const updated = { ...n, path: `${newPath}/${relativePath}` } as Note;
                if (selectedNote?.id === n.id) updatedSelectedLocal = updated;
                return updated;
              }
              return n;
            }));
            if (updatedSelectedLocal) setSelectedNote(updatedSelectedLocal);

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
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 500);
    } catch (error) {
      console.error('Failed to move item:', error);
    } finally {
      setDraggedItem(null);
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [notes, folders, isSignedIn, setIsLoading, setNotes, setFolders, selectedNote, setSelectedNote]);

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
}; 