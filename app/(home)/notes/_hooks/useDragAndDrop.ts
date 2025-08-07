import { useCallback } from 'react';
import { useDrive } from '../../../lib/driveContext';
import { driveService } from '../../../lib/googleDrive';
import { Note, Folder } from '../_components/types';

export const useDragAndDrop = (
  notes: Note[],
  setNotes: (notes: Note[]) => void,
  folders: Folder[],
  setFolders: (folders: Folder[]) => void,
  setIsLoading: (loading: boolean) => void,
  setSyncProgress: (progress: number) => void
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
    setDragOver: (id: string | null) => void
  ) => {
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
  }, [notes, folders, isSignedIn, setIsLoading, setNotes, setFolders]);

  return {
    handleDragStart,
    handleDragOver,
    handleDrop,
  };
}; 