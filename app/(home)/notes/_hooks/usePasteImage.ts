import { useCallback } from 'react';
import { useDrive } from '../../../lib/driveContext';
import { driveService } from '../../../lib/googleDrive';
import { Note, Folder } from '../_components/types';

interface UsePasteImageProps {
  notes: Note[];
  folders: Folder[];
  selectedNote: Note | null;
  setEditContent: (content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setSyncProgress: (progress: number) => void;
}

export const usePasteImage = ({
  notes,
  folders,
  selectedNote,
  setEditContent,
  setIsLoading,
  setSyncProgress
}: UsePasteImageProps) => {
  const { isSignedIn } = useDrive();

  const uploadPastedImage = useCallback(async (imageFile: File): Promise<{
    filename: string;
    imageUrl: string;
    markdownLink: string;
  } | null> => {
    if (!selectedNote || !isSignedIn) {
      console.warn('Cannot upload image: No selected note or not signed in');
      return null;
    }

    try {
      setIsLoading(true);
      setSyncProgress(10);

      // Find the parent folder of the current note
      // Handle both root folder (empty path) and nested folders
      let parentFolder: Folder | undefined;
      
      if (selectedNote.path === '') {
        // Note is in root folder - look for root folder or create one
        parentFolder = folders.find(f => f.id === 'root' || f.path === '');
      } else {
        // Note is in a nested folder - find the folder with matching path
        parentFolder = folders.find(f => f.path === selectedNote.path);
      }

      // If no parent folder found, try to find any folder that could be used as fallback
      if (!parentFolder) {
        console.warn('No parent folder found for note path:', selectedNote.path);
        
        // Try to find the root folder or any available folder
        parentFolder = folders.find(f => f.id === 'root' || f.path === '') || 
                     folders.find(f => f.driveFolderId);
        
        if (!parentFolder) {
          console.error('No suitable folder found for image upload');
          return null;
        }
      }

      // If root folder doesn't have drive folder ID, try to get it from Drive
      if (parentFolder.id === 'root' && !parentFolder.driveFolderId) {
        try {
          console.log('Root folder missing drive folder ID, attempting to get it...');
          const notesFolderId = await driveService.findOrCreateNotesFolder();
          
          // Update the root folder with the drive folder ID
          parentFolder = { ...parentFolder, driveFolderId: notesFolderId };
          
          // Note: We can't update the folders state here since this is a callback
          // The folder will be updated on next sync
        } catch (error) {
          console.error('Failed to get Notes folder ID:', error);
          return null;
        }
      }

      const parentDriveId = parentFolder.driveFolderId;

      if (!parentDriveId) {
        console.warn('Parent folder has no drive folder ID');
        return null;
      }

      setSyncProgress(30);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
      const filename = `image-${timestamp}.${extension}`;

      setSyncProgress(50);

      // Upload image to Google Drive in the same folder as the note
      const imageFileId = await driveService.uploadImage(filename, imageFile, parentDriveId);

      setSyncProgress(80);

      // Create shareable URL for the image - use direct access format
      const imageUrl = `https://drive.google.com/uc?id=${imageFileId}`;
      const markdownLink = `![${filename}](${imageUrl})`;

      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);

      return {
        filename,
        imageUrl,
        markdownLink
      };
    } catch (error) {
      console.error('Failed to upload pasted image:', error);
      setSyncProgress(0);
      return null;
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [selectedNote, folders, isSignedIn, setIsLoading, setSyncProgress]);

  const handlePasteImage = useCallback(async (event: ClipboardEvent): Promise<boolean> => {
    const items = event.clipboardData?.items;
    if (!items) return false;

    // Look for image items in clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        
        const file = item.getAsFile();
        if (!file) continue;

        const result = await uploadPastedImage(file);
        if (result) {
          // Insert the markdown link at cursor position
          const textarea = document.activeElement as HTMLTextAreaElement;
          if (textarea && textarea.tagName === 'TEXTAREA') {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentContent = textarea.value;
            
            const newContent = currentContent.substring(0, start) + 
                             '\n' + result.markdownLink + '\n' + 
                             currentContent.substring(end);
            
            setEditContent(newContent);
            
            // Set cursor position after the inserted image
            setTimeout(() => {
              textarea.focus();
              const newPos = start + result.markdownLink.length + 2; // +2 for the newlines
              textarea.setSelectionRange(newPos, newPos);
            }, 0);
          }
          return true;
        }
      }
    }
    return false;
  }, [uploadPastedImage, setEditContent]);

  return {
    handlePasteImage,
    uploadPastedImage
  };
}; 