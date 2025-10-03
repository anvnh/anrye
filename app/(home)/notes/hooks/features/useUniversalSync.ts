import { useCallback } from 'react';
import { useStorageSettings } from '../settings/useStorageSettings';
import { useDriveSync } from './useDriveSync';
import { tursoService } from '../../services/tursoService';

export const useUniversalSync = (
  notes: any[],
  setNotes: React.Dispatch<React.SetStateAction<any[]>>,
  folders: any[],
  setFolders: React.Dispatch<React.SetStateAction<any[]>>,
  setIsLoading: (loading: boolean) => void,
  setSyncProgress: (progress: number) => void
) => {
  const { currentProvider } = useStorageSettings();
  
  // Get Google Drive sync functions
  const {
    forceSync: driveForceSync,
    clearCacheAndSync: driveClearCacheAndSync,
  } = useDriveSync(notes, setNotes, folders, setFolders, setIsLoading, setSyncProgress);

  // R2-Turso sync functions
  const tursoForceSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      
      await tursoService.connect();
      setSyncProgress(30);
      
      // Load folders from Turso
      const tursoFolders = await tursoService.getAllFolders();
      setSyncProgress(50);
      
      // Load notes from Turso
      const tursoNotes = await tursoService.getAllNotes();
      setSyncProgress(70);
      
      // Convert DB rows → UI models
      const idToFolder = new Map<string, { id: string; name: string; parentId?: string }>();
      for (const f of tursoFolders) {
        idToFolder.set((f as any).id, { id: (f as any).id, name: (f as any).name, parentId: (f as any).parentId });
      }

      const computePath = (folderId?: string): string => {
        if (!folderId) return '';
        const segments: string[] = [];
        let cur: string | undefined = folderId;
        let safety = 0;
        while (cur && safety < 1000) {
          const node = idToFolder.get(cur);
          if (!node) break;
          segments.push(node.name);
          cur = node.parentId || undefined;
          safety += 1;
        }
        return segments.reverse().join('/');
      };

      const convertedFolders = tursoFolders.map((f: any) => {
        const parentId = f.parentId as string | undefined;
        const path = computePath(f.id);
        const isTopLevel = !parentId;
        return {
          id: f.id,
          name: f.name,
          path,
          parentId: isTopLevel ? 'root' : (parentId || ''),
          expanded: false,
        };
      });

      const convertedNotes = tursoNotes.map((n: any) => {
        const notePath = computePath(n.folderId);
        return {
          id: n.id,
          title: n.title,
          content: n.content,
          path: notePath,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        };
      });

      // Update local state
      setFolders([{ id: 'root', name: 'Notes', path: '', parentId: '', expanded: true }, ...convertedFolders]);
      setNotes(convertedNotes);
      setSyncProgress(100);
      
      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to sync with Turso:', error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [setIsLoading, setSyncProgress, setFolders, setNotes]);

  const tursoClearCacheAndSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      
      // Clear any cached data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('folders-cache');
        localStorage.removeItem('notes-cache');
        localStorage.removeItem('has-synced-drive');
        localStorage.removeItem('has-synced-with-drive');
      }
      
      await tursoService.connect();
      setSyncProgress(30);
      
      // Load fresh data from Turso
      const tursoFolders = await tursoService.getAllFolders();
      setSyncProgress(50);
      
      const tursoNotes = await tursoService.getAllNotes();
      setSyncProgress(70);
      
      // Convert DB rows → UI models
      const idToFolder = new Map<string, { id: string; name: string; parentId?: string }>();
      for (const f of tursoFolders) {
        idToFolder.set((f as any).id, { id: (f as any).id, name: (f as any).name, parentId: (f as any).parentId });
      }

      const computePath = (folderId?: string): string => {
        if (!folderId) return '';
        const segments: string[] = [];
        let cur: string | undefined = folderId;
        let safety = 0;
        while (cur && safety < 1000) {
          const node = idToFolder.get(cur);
          if (!node) break;
          segments.push(node.name);
          cur = node.parentId || undefined;
          safety += 1;
        }
        return segments.reverse().join('/');
      };

      const convertedFolders = tursoFolders.map((f: any) => {
        const parentId = f.parentId as string | undefined;
        const path = computePath(f.id);
        const isTopLevel = !parentId;
        return {
          id: f.id,
          name: f.name,
          path,
          parentId: isTopLevel ? 'root' : (parentId || ''),
          expanded: false,
        };
      });

      const convertedNotes = tursoNotes.map((n: any) => {
        const notePath = computePath(n.folderId);
        return {
          id: n.id,
          title: n.title,
          content: n.content,
          path: notePath,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        };
      });

      // Update local state
      setFolders([{ id: 'root', name: 'Notes', path: '', parentId: '', expanded: true }, ...convertedFolders]);
      setNotes(convertedNotes);
      setSyncProgress(100);
      
      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to clear cache and sync with Turso:', error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [setIsLoading, setSyncProgress, setFolders, setNotes]);

  // Universal sync functions that work with any provider
  const forceSync = useCallback(async () => {
    if (currentProvider === 'google-drive') {
      await driveForceSync();
    } else if (currentProvider === 'r2-turso') {
      await tursoForceSync();
    }
  }, [currentProvider, driveForceSync, tursoForceSync]);

  const clearCacheAndSync = useCallback(async () => {
    if (currentProvider === 'google-drive') {
      await driveClearCacheAndSync();
    } else if (currentProvider === 'r2-turso') {
      await tursoClearCacheAndSync();
    }
  }, [currentProvider, driveClearCacheAndSync, tursoClearCacheAndSync]);

  return {
    forceSync,
    clearCacheAndSync,
  };
};
