import React, { useState, useCallback } from 'react';
import { useDrive } from '../../../lib/driveContext';
import { driveService } from '../../../lib/googleDrive';
import { Note, Folder } from '../_components/types';

// Lazy load the drive service
const loadDriveService = async () => {
  if (typeof window !== 'undefined') {
    return await import('../../../lib/googleDrive');
  }
  return null;
};

export const useDriveSync = (
  notes: Note[],
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>,
  folders: Folder[],
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>,
  setIsLoading: (loading: boolean) => void,
  setSyncProgress: (progress: number) => void
) => {
  const { isSignedIn, forceReAuthenticate } = useDrive();
  const [hasSyncedWithDrive, setHasSyncedWithDrive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadFromDrive = async (parentDriveId: string, parentPath: string, driveService: any) => {
    try {
      const files = await driveService.listFiles(parentDriveId);

      for (const file of files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // It's a folder
          const folderPath = parentPath ? `${parentPath}/${file.name}` : file.name;

          // Check if folder already exists using callback to get latest state
          setFolders(prevFolders => {
            const existingFolder = prevFolders.find(f => f.driveFolderId === file.id);
            // Also check by name and path to prevent duplicates with different IDs
            const existingByPath = prevFolders.find(f => f.name === file.name && f.path === folderPath);

            if (!existingFolder && !existingByPath) {
              const newFolder: Folder = {
                id: Date.now().toString() + Math.random(),
                name: file.name,
                path: folderPath,
                parentId: prevFolders.find(f => f.driveFolderId === parentDriveId)?.id || 'root',
                driveFolderId: file.id,
                expanded: false
              };

              return [...prevFolders, newFolder];
            } else if (existingByPath && !existingByPath.driveFolderId) {
              // Update existing folder with Drive ID if missing
              return prevFolders.map(f => 
                f === existingByPath ? { ...f, driveFolderId: file.id } : f
              );
            }
            return prevFolders; // No change if folder already exists
          });

          // Recursively load subfolders
          await loadFromDrive(file.id, folderPath, driveService);
        } else if (file.name.endsWith('.md') || file.mimeType === 'text/markdown' || file.mimeType === 'text/plain') {
          // It's a markdown file (either has .md extension, text/markdown, or text/plain mime type)
          const notePath = parentPath;
          const noteTitle = file.name.endsWith('.md') ? file.name.replace('.md', '') : file.name;

          // Check if note already exists using callback to get latest state
          setNotes(prevNotes => {
            const existingNote = prevNotes.find(n => n.driveFileId === file.id);
            // Also check by title and path to prevent duplicates with different IDs
            const existingByTitlePath = prevNotes.find(n => n.title === noteTitle && n.path === notePath);

            if (!existingNote && !existingByTitlePath) {
              // Load content and create new note
              driveService.getFile(file.id).then((content: string) => {
                const newNote: Note = {
                  id: Date.now().toString() + Math.random(),
                  title: noteTitle,
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
              }).catch((error: any) => {
                console.error('Failed to load note content for', noteTitle, ':', error);
              });

              return prevNotes; // Return unchanged as we're loading content async
            } else if (existingByTitlePath && !existingByTitlePath.driveFileId) {
              // Update existing note with Drive ID if missing
              return prevNotes.map(n => 
                n === existingByTitlePath ? { ...n, driveFileId: file.id } : n
              );
            } else if (existingNote) {
              // Note exists, check if content actually changed before updating
              driveService.getFile(file.id).then((content: string) => {
                setNotes(currentNotes => {
                  const currentNote = currentNotes.find(n => n.driveFileId === file.id);
                  if (currentNote && currentNote.content !== content) {
                    // Only update if content actually changed
                    return currentNotes.map(n => 
                      n.driveFileId === file.id 
                        ? { 
                            ...n, 
                            content: content,
                            updatedAt: file.modifiedTime 
                          } 
                        : n
                    );
                  }
                  return currentNotes; // No change if content is the same
                });
              }).catch((error: any) => {
                console.error('Failed to update note content for', noteTitle, ':', error);
              });
            }
            return prevNotes; // No change if note already exists
          });
        }
      }
    } catch (error) {
      console.error('Failed to load from Drive:', error);
    }
  };

  const syncWithDrive = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      
      const driveModule = await loadDriveService();
      if (!driveModule) return;
      
      const notesFolderId = await driveModule.driveService.findOrCreateNotesFolder();

      setSyncProgress(30);
      // Update root folder with Drive ID if not already set
      setFolders(prev => {
        const rootFolder = prev.find(f => f.id === 'root');
        if (rootFolder && !rootFolder.driveFolderId) {
          return prev.map(folder =>
            folder.id === 'root'
              ? { ...folder, driveFolderId: notesFolderId }
              : folder
          );
        }
        return prev;
      });

      setSyncProgress(50);
      // Only load from Drive if we haven't synced yet
      if (!hasSyncedWithDrive) {
        await loadFromDrive(notesFolderId, '', driveModule.driveService);
        setSyncProgress(90);
        setHasSyncedWithDrive(true);
      } else {
      }
      setSyncProgress(100);
    } catch (error) {
      console.error('Failed to sync with Drive:', error);
      
      // Check if it's a GAPI error that needs reset
      if (error instanceof Error && error.message.includes('gapi.client.drive is undefined')) {
        
        try {
          await forceReAuthenticate();
          // Retry sync once after re-authentication
          setTimeout(() => {
            syncWithDrive();
          }, 1000);
          return;
        } catch (retryError) {
          console.error('Failed to re-authenticate:', retryError);
        }
      }
      
      // Show error to user
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try signing in again.`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncProgress(0), 500); // Keep progress visible briefly
    }
  }, [hasSyncedWithDrive, isSignedIn, forceReAuthenticate, setIsLoading, setSyncProgress, setFolders, setNotes]);

  const forceSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      
      const driveModule = await loadDriveService();
      if (!driveModule) return;
      
      const notesFolderId = await driveModule.driveService.findOrCreateNotesFolder();
      setSyncProgress(20);

      // Get all files and folders from Drive
      const getAllDriveFiles = async (parentId: string, currentPath: string = ''): Promise<{files: any[], folders: any[]}> => {
        const files = await driveModule.driveService.listFiles(parentId);
        const driveFiles: any[] = [];
        const driveFolders: any[] = [];

        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            driveFolders.push({
              ...file,
              path: currentPath ? `${currentPath}/${file.name}` : file.name
            });
            // Recursively get subfolders and files
            const subResults = await getAllDriveFiles(file.id, currentPath ? `${currentPath}/${file.name}` : file.name);
            driveFiles.push(...subResults.files);
            driveFolders.push(...subResults.folders);
          } else if (file.name.endsWith('.md') || file.mimeType === 'text/markdown' || file.mimeType === 'text/plain') {
            driveFiles.push({
              ...file,
              path: currentPath,
              title: file.name.endsWith('.md') ? file.name.replace('.md', '') : file.name
            });
          }
        }

        return { files: driveFiles, folders: driveFolders };
      };

      setSyncProgress(30);
      const { files: driveFiles, folders: driveFolders } = await getAllDriveFiles(notesFolderId);
      
      // Create sets of Drive file and folder IDs for quick lookup
      const driveFileIds = new Set(driveFiles.map(f => f.id));
      const driveFolderIds = new Set([notesFolderId, ...driveFolders.map(f => f.id)]);

      setSyncProgress(50);

      // Remove local notes that don't exist on Drive
      setNotes(prevNotes => {
        const notesToKeep = prevNotes.filter(note => {
          if (!note.driveFileId) return true; // Keep local-only notes
          const exists = driveFileIds.has(note.driveFileId);
          return exists;
        });
        return notesToKeep;
      });

      setSyncProgress(60);

      // Remove local folders that don't exist on Drive and update root folder
      setFolders(prevFolders => {
        const foldersToKeep = prevFolders.filter(folder => {
          if (folder.id === 'root') return true; // Always keep root
          if (!folder.driveFolderId) return true; // Keep local-only folders
          const exists = driveFolderIds.has(folder.driveFolderId);
          return exists;
        });
        
        // Update root folder with drive folder ID
        return foldersToKeep.map(folder => {
          if (folder.id === 'root') {
            return { ...folder, driveFolderId: notesFolderId };
          }
          return folder;
        });
      });

      setSyncProgress(70);

      // Load/update from Drive (this will add new files and update existing ones)
      await loadFromDrive(notesFolderId, '', driveModule.driveService);
      
      setSyncProgress(90);
      
      // Mark as synced
      setHasSyncedWithDrive(true);
      setSyncProgress(100);
      
    } catch (error) {
      console.error('Force sync failed:', error);
      
      // Check if it's a GAPI error that needs reset
      if (error instanceof Error && error.message.includes('gapi.client.drive is undefined')) {
        
        try {
          await forceReAuthenticate();
          // Retry sync once after re-authentication
          setTimeout(() => {
            forceSync();
          }, 1000);
          return;
        } catch (retryError) {
          console.error('Failed to re-authenticate:', retryError);
        }
      }
      
      alert(`Force sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncProgress(0), 500);
    }
  }, [isSignedIn, forceReAuthenticate, setIsLoading, setSyncProgress, setFolders, setNotes]);

  return {
    hasSyncedWithDrive,
    setHasSyncedWithDrive,
    isInitialized,
    setIsInitialized,
    syncWithDrive,
    forceSync,
    loadFromDrive,
  };
}; 