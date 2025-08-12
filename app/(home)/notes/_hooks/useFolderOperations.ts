import { useCallback } from 'react';
import { useDrive } from '../../../lib/driveContext';
import { driveService } from '../../../lib/googleDrive';
import { Note, Folder } from '../_components/types';

export const useFolderOperations = (
  notes: Note[],
  setNotes: (notes: Note[]) => void,
  folders: Folder[],
  setFolders: (folders: Folder[]) => void,
  selectedPath: string,
  setIsLoading: (loading: boolean) => void,
  setSyncProgress: (progress: number) => void
) => {
  const { isSignedIn } = useDrive();

  const createFolder = useCallback(async (newFolderName: string) => {
    if (!newFolderName.trim()) return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      const parentFolder = folders.find(f => f.path === selectedPath);
      const parentDriveId = parentFolder?.driveFolderId;

      setSyncProgress(30);

      let driveFolderId;
      if (isSignedIn && parentDriveId) {
        setSyncProgress(50);
        driveFolderId = await driveService.createFolder(newFolderName, parentDriveId);
        setSyncProgress(80);
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
      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [folders, selectedPath, isSignedIn, setIsLoading, setSyncProgress, setFolders]);

  const deleteFolder = useCallback(async (folderId: string) => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete || folderId === 'root') return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      setSyncProgress(20);

      // Delete all notes in this folder (and from Drive)
      const notesToDelete = notes.filter(note => note.path.startsWith(folderToDelete.path));
      const totalItems = notesToDelete.length + 1; // +1 for the folder itself
      let processedItems = 0;

      setSyncProgress(30);

      for (const note of notesToDelete) {
        if (isSignedIn && note.driveFileId) {
          await driveService.deleteFile(note.driveFileId);
        }
        processedItems++;
        // Update progress based on how many items we've processed
        const progressIncrement = 40 / totalItems; // 40% range for deleting notes
        setSyncProgress(30 + (progressIncrement * processedItems));
      }

      setSyncProgress(70);

      // Delete from Drive if signed in and has Drive folder ID
      if (isSignedIn && folderToDelete.driveFolderId) {
        setSyncProgress(75);
        await driveService.deleteFile(folderToDelete.driveFolderId);
        setSyncProgress(85);
      }

      setNotes(notes.filter(note => !note.path.startsWith(folderToDelete.path)));

      // Delete the folder and its subfolders
      setFolders(folders.filter(folder =>
        folder.id !== folderId && !folder.path.startsWith(folderToDelete.path + '/')
      ));

      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [folders, notes, isSignedIn, setIsLoading, setSyncProgress, setNotes, setFolders]);

  const renameFolder = useCallback(async (folderId: string, currentName: string, newName: string) => {
    const folderToRename = folders.find(f => f.id === folderId);
    if (!folderToRename || folderId === 'root') return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      // Update folder name in Drive if signed in and has Drive folder ID
      if (isSignedIn && folderToRename.driveFolderId) {
        setSyncProgress(30);
        await driveService.renameFolder(folderToRename.driveFolderId, newName);
        setSyncProgress(60);
      }

      // Update folder locally
      setFolders(folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, name: newName };
        }
        return folder;
      }));

      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to rename folder:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [folders, isSignedIn, setIsLoading, setSyncProgress, setFolders]);

  const toggleFolder = useCallback((folderId: string) => {
    setFolders(prevFolders => 
      prevFolders.map(folder =>
        folder.id === folderId
          ? { ...folder, expanded: !folder.expanded }
          : folder
      )
    );
  }, [setFolders]);

  return {
    createFolder,
    deleteFolder,
    renameFolder,
    toggleFolder,
  };
}; 