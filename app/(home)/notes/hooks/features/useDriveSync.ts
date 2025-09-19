import React, { useState, useCallback, useRef } from 'react';
import { useDrive } from '../../../../lib/driveContext';
import { driveService } from '../../../../lib/googleDrive';
import { Note, Folder } from '../../components/types';

// Lazy load the drive service
const loadDriveService = async () => {
  if (typeof window !== 'undefined') {
    return await import('../../../../lib/googleDrive');
  }
  return null;
};

// Utility functions for optimization
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const BATCH_SIZE = 10; // Process 10 files at a time
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Type definitions for Drive files
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

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
  
  // Cache management
  const cacheRef = useRef<Map<string, { data: any, timestamp: number }>>(new Map());
  const loadingPromisesRef = useRef<Map<string, Promise<any>>>(new Map());

  // Cache management functions
  const getCachedData = (key: string) => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  };

  const setCachedData = (key: string, data: any) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  };

  const clearCache = () => {
    cacheRef.current.clear();
    loadingPromisesRef.current.clear();
  };

  // Memory management - cleanup old cache entries
  const cleanupCache = () => {
    const now = Date.now();
    for (const [key, value] of cacheRef.current.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cacheRef.current.delete(key);
      }
    }
  };

  // Optimized parallel loading function
  const loadFromDrive = async (parentDriveId: string, parentPath: string, driveService: any) => {
    try {
      const cacheKey = `files_${parentDriveId}`;
      let files = getCachedData(cacheKey);
      
      if (!files) {
        files = await driveService.listFiles(parentDriveId);
        setCachedData(cacheKey, files);
      }

      // Separate folders and files for parallel processing
      const folders = files.filter((file: DriveFile) => 
        file.mimeType === 'application/vnd.google-apps.folder' && file.name !== 'Images'
      );
      const noteFiles = files.filter((file: DriveFile) => 
        file.name.endsWith('.md') || file.mimeType === 'text/markdown' || file.mimeType === 'text/plain'
      );

      // Process folders in parallel
      const folderPromises = folders.map(async (file: DriveFile) => {
        const folderPath = parentPath ? `${parentPath}/${file.name}` : file.name;
        
        setFolders(prevFolders => {
          const existingFolder = prevFolders.find(f => f.driveFolderId === file.id);
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
            return prevFolders.map(f => 
              f === existingByPath ? { ...f, driveFolderId: file.id } : f
            );
          } else if (existingFolder && existingFolder.name !== file.name) {
            return prevFolders.map(f => 
              f.driveFolderId === file.id 
                ? { ...f, name: file.name, path: folderPath }
                : f
            );
          }
          return prevFolders;
        });

        // Recursively load subfolders
        await loadFromDrive(file.id, folderPath, driveService);
      });

      // Process note files in batches
      const noteBatches = chunkArray<DriveFile>(noteFiles, BATCH_SIZE);
      const notePromises = noteBatches.map(async (batch: DriveFile[]) => {
        await Promise.all(batch.map(async (file: DriveFile) => {
          const notePath = parentPath;
          const noteTitle = file.name.endsWith('.md') ? file.name.replace('.md', '') : file.name;
          
          // Check if already loading this file
          const loadingKey = `loading_${file.id}`;
          if (loadingPromisesRef.current.has(loadingKey)) {
            return;
          }

          const loadPromise = (async () => {
            try {
              const content = await driveService.getFile(file.id);
              
              let noteContent = content;
              let isEncrypted = false;
              let encryptedData: { data: string; iv: string; salt: string; tag: string; algorithm: string; iterations: number; } | undefined = undefined;

              // Check if content is encrypted
              try {
                const parsed = JSON.parse(content);
                if (parsed.encrypted === true && parsed.data) {
                  isEncrypted = true;
                  encryptedData = parsed.data;
                  noteContent = `# 🔒 Encrypted Note

This note was loaded from Google Drive in encrypted format. 

**To view the content:**
1. Right-click on this note in the sidebar
2. Select "Decrypt Note" 
3. Enter your password to restore the original content

The content will then be available for viewing and editing normally.`;
                }
              } catch (e) {
                // Not JSON, treat as regular content
              }

              setNotes(prevNotes => {
                const existingNote = prevNotes.find(n => n.driveFileId === file.id);
                const existingByTitlePath = prevNotes.find(n => n.title === noteTitle && n.path === notePath);

                if (!existingNote && !existingByTitlePath) {
                  const newNote: Note = {
                    id: Date.now().toString() + Math.random(),
                    title: noteTitle,
                    content: noteContent,
                    path: notePath,
                    driveFileId: file.id,
                    createdAt: file.createdTime,
                    updatedAt: file.modifiedTime,
                    isEncrypted,
                    encryptedData
                  };
                  return [...prevNotes, newNote];
                } else if (existingByTitlePath && !existingByTitlePath.driveFileId) {
                  return prevNotes.map(n => 
                    n === existingByTitlePath ? { ...n, driveFileId: file.id } : n
                  );
                } else if (existingNote) {
                  const needsUpdate = existingNote.content !== noteContent || 
                                     existingNote.title !== noteTitle ||
                                     existingNote.isEncrypted !== isEncrypted;
                  if (needsUpdate) {
                    return prevNotes.map(n => 
                      n.driveFileId === file.id 
                        ? { 
                            ...n, 
                            title: noteTitle,
                            content: noteContent,
                            updatedAt: file.modifiedTime,
                            isEncrypted,
                            encryptedData
                          } 
                        : n
                    );
                  }
                }
                return prevNotes;
              });
            } catch (error) {
              console.error('Failed to load note content for', noteTitle, ':', error);
            }
          })();

          loadingPromisesRef.current.set(loadingKey, loadPromise);
          await loadPromise;
          loadingPromisesRef.current.delete(loadingKey);
        }));
      });

      // Wait for all operations to complete
      await Promise.all([...folderPromises, ...notePromises]);
      
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

  const clearCacheAndSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(5);
      
      // Clear data cache only (preserve authentication tokens)
      if (typeof window !== 'undefined') {
        // Clear folder and note cache
        localStorage.removeItem('folders-cache');
        localStorage.removeItem('notes-cache');
        localStorage.removeItem('notes-new');
        localStorage.removeItem('folders-new');
        
        // Clear image cache
        localStorage.removeItem('image-thumbnail-cache');
        
        // Clear sync status flags
        localStorage.removeItem('has-synced-with-drive');
        localStorage.removeItem('has-synced-love-drive');
        localStorage.removeItem('has-synced-drive');
        
        // Clear other data cache items (but preserve auth tokens)
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('cache') || 
            key.includes('sync') || 
            (key.includes('drive') && !key.includes('token') && !key.includes('auth'))
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('Cleared data cache (preserved authentication tokens)');
      }
      
      // Clear in-memory cache
      clearCache();
      
      setSyncProgress(10);
      
      // Reset all sync states
      setHasSyncedWithDrive(false);
      setIsInitialized(false);
      
      setSyncProgress(15);
      
      // Clear all local data except root folder
      setNotes([]);
      setFolders([{ id: 'root', name: 'Notes', path: '', parentId: '', expanded: true }]);
      
      setSyncProgress(20);
      
      const driveModule = await loadDriveService();
      if (!driveModule) return;
      
      const notesFolderId = await driveModule.driveService.findOrCreateNotesFolder();
      setSyncProgress(30);

      // Get all files and folders from Drive
      const getAllDriveFiles = async (parentId: string, currentPath: string = ''): Promise<{files: any[], folders: any[]}> => {
        const files = await driveModule.driveService.listFiles(parentId);
        const driveFiles: any[] = [];
        const driveFolders: any[] = [];

        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            // Skip the Images folder as it's handled separately by ImagesSection
            if (file.name === 'Images') {
              continue;
            }
            
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

      setSyncProgress(40);
      const { files: driveFiles, folders: driveFolders } = await getAllDriveFiles(notesFolderId);
      
      setSyncProgress(60);

      // Load all folders in parallel
      const folderPromises = driveFolders.map(async (folder: any) => {
        const folderPath = folder.path;
        const parentFolder = driveFolders.find(f => f.id === folder.parents?.[0]) || { path: '' };
        const parentPath = parentFolder.path;
        
        setFolders(prevFolders => {
          const existingFolder = prevFolders.find(f => f.driveFolderId === folder.id);
          if (!existingFolder) {
            const newFolder: Folder = {
              id: Date.now().toString() + Math.random(),
              name: folder.name,
              path: folderPath,
              parentId: prevFolders.find(f => f.driveFolderId === folder.parents?.[0])?.id || 'root',
              driveFolderId: folder.id,
              expanded: false
            };
            return [...prevFolders, newFolder];
          }
          return prevFolders;
        });
      });
      
      setSyncProgress(70);

      // Load all notes in batches
      const noteBatches = chunkArray(driveFiles, BATCH_SIZE);
      const notePromises = noteBatches.map(async (batch) => {
        await Promise.all(batch.map(async (file: any) => {
          try {
            const content = await driveModule.driveService.getFile(file.id);
            const noteTitle = file.title;
            const notePath = file.path;
            
            setNotes(prevNotes => {
              const existingNote = prevNotes.find(n => n.driveFileId === file.id);
              if (!existingNote) {
                let noteContent = content;
                let isEncrypted = false;
                let encryptedData = undefined;

                // Check if content is encrypted
                try {
                  const parsed = JSON.parse(content);
                  if (parsed.encrypted === true && parsed.data) {
                    isEncrypted = true;
                    encryptedData = parsed.data;
                    noteContent = `# 🔒 Encrypted Note

This note was loaded from Google Drive in encrypted format. 

**To view the content:**
1. Right-click on this note in the sidebar
2. Select "Decrypt Note" 
3. Enter your password to restore the original content

The content will then be available for viewing and editing normally.`;
                  }
                } catch (e) {
                  // Not JSON, treat as regular content
                }

                const newNote: Note = {
                  id: Date.now().toString() + Math.random(),
                  title: noteTitle,
                  content: noteContent,
                  path: notePath,
                  driveFileId: file.id,
                  createdAt: file.createdTime,
                  updatedAt: file.modifiedTime,
                  isEncrypted,
                  encryptedData
                };
                return [...prevNotes, newNote];
              }
              return prevNotes;
            });
          } catch (error) {
            console.error('Failed to load note content for', file.title, ':', error);
          }
        }));
      });

      // Wait for all operations to complete
      await Promise.all([...folderPromises, ...notePromises]);
      
      setSyncProgress(90);
      
      // Mark as synced and initialized
      setHasSyncedWithDrive(true);
      setIsInitialized(true);
      setSyncProgress(100);
      
      console.log('Cache cleared and fresh sync completed successfully');
      
    } catch (error) {
      console.error('Clear cache and sync failed:', error);
      
      // Check if it's a GAPI error that needs reset
      if (error instanceof Error && error.message.includes('gapi.client.drive is undefined')) {
        
        try {
          await forceReAuthenticate();
          // Retry sync once after re-authentication
          setTimeout(() => {
            clearCacheAndSync();
          }, 1000);
          return;
        } catch (retryError) {
          console.error('Failed to re-authenticate:', retryError);
        }
      }
      
      alert(`Clear cache and sync failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncProgress(0), 500);
    }
  }, [isSignedIn, forceReAuthenticate, setIsLoading, setSyncProgress, setFolders, setNotes]);

  const forceSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      
      // Clear any cached data to ensure fresh sync
      if (typeof window !== 'undefined') {
        // Clear any cached folder/note data
        localStorage.removeItem('folders-cache');
        localStorage.removeItem('notes-cache');
  // Reset sync indicator so init logic doesn't skip
  localStorage.removeItem('has-synced-drive');
      }
      
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
            // Skip the Images folder as it's handled separately by ImagesSection
            if (file.name === 'Images') {
              continue;
            }
            
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

      // Reset sync state to force fresh load
      setHasSyncedWithDrive(false);
      
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
    clearCacheAndSync,
    loadFromDrive,
    clearCache,
    cleanupCache,
  };
}; 