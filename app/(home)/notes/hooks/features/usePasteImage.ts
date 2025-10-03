import { useCallback } from 'react';
import { useDrive } from '../../../../lib/driveContext';
import { driveService } from '../../services/googleDrive';
import { r2Service } from '../../services/r2Service';
import { useStorageSettings } from '../settings/useStorageSettings';
import { Note } from '../../components/types';

interface UsePasteImageProps {
  notes: Note[];
  selectedNote: Note | null;
  setEditContent: (content: string) => void;
  setIsLoading: (loading: boolean) => void;
  setSyncProgress: (progress: number) => void;
  onBeforeUpload?: (defaultFilename: string, file: File) => Promise<string | null>;
  getTargetTextarea?: () => HTMLTextAreaElement | null;
}

export const usePasteImage = ({
  notes,
  selectedNote,
  setEditContent,
  setIsLoading,
  setSyncProgress,
  onBeforeUpload,
  getTargetTextarea
}: UsePasteImageProps) => {
  const { isSignedIn } = useDrive();
  const { currentProvider, storageStatus } = useStorageSettings();

  const uploadPastedImage = useCallback(async (imageFile: File): Promise<{
    filename: string;
    imageUrl: string;
    markdownLink: string;
  } | null> => {
    // Check if we have a valid storage configuration
    if (!selectedNote) {
      return null;
    }

    if (currentProvider === 'google-drive' && !isSignedIn) {
      return null;
    }

    if (currentProvider === 'r2-turso' && !storageStatus.isConnected) {
      // Check the R2 service directly
      try {
        const isR2Auth = await r2Service.isAuthenticated();
        if (!isR2Auth) {
          return null;
        }
        // Continue with upload despite storageStatus saying not connected
      } catch (error) {
        return null;
      }
    }

    try {
      setIsLoading(true);
      setSyncProgress(10);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = imageFile.name.split('.')?.pop()?.toLowerCase() || 'png';
      const defaultFilename = `image-${timestamp}.${extension}`;

      // Allow rename only for Google Drive. For R2, skip rename dialog for faster UX.
      let finalFilename = defaultFilename;
      if (currentProvider === 'google-drive' && onBeforeUpload) {
        try {
          const maybeNew = await onBeforeUpload(defaultFilename, imageFile);
          if (maybeNew && typeof maybeNew === 'string') {
            const provided = maybeNew.trim();
            if (provided) {
              finalFilename = provided.endsWith(`.${extension}`)
                ? provided
                : `${provided}.${extension}`;
            }
          }
        } catch (_) {}
      }

      setSyncProgress(30);

      let imageFileId: string;
      let imageUrl: string;

      if (currentProvider === 'google-drive') {
        // Upload to Google Drive
        const imagesFolderId = await driveService.findOrCreateImagesFolder();
        setSyncProgress(50);
        
        imageFileId = await driveService.uploadImage(finalFilename, imageFile, imagesFolderId);
        imageUrl = `https://drive.google.com/uc?id=${imageFileId}`;
      } else if (currentProvider === 'r2-turso') {
        // Upload to Cloudflare R2
        setSyncProgress(50);
        
        imageFileId = await r2Service.uploadImage(finalFilename, imageFile, selectedNote.id);
        // Construct both possible URL styles to maximize compatibility with your bucket visibility
        const primary = r2Service.getImageUrl(imageFileId);
        imageUrl = primary;
      } else {
        throw new Error(`Unsupported storage provider: ${currentProvider}`);
      }

      setSyncProgress(80);

      const markdownLink = `![${finalFilename}](${imageUrl})`;

      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);

      // Dispatch event to notify that image was uploaded
      window.dispatchEvent(new CustomEvent('imageUploaded'));

      return {
        filename: finalFilename,
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
  }, [selectedNote, isSignedIn, currentProvider, storageStatus.isConnected, setIsLoading, setSyncProgress]);

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

        // Capture insertion target and cursor before opening any modal
        const initialTextarea = getTargetTextarea ? getTargetTextarea() : (document.activeElement as HTMLTextAreaElement);
        const canInsertHere = initialTextarea && initialTextarea.tagName === 'TEXTAREA';
        const start = canInsertHere ? initialTextarea!.selectionStart : null;
        const end = canInsertHere ? initialTextarea!.selectionEnd : null;
        const initialContent = canInsertHere ? initialTextarea!.value : null;

        const result = await uploadPastedImage(file);
        if (result) {
          // Insert the markdown link at the original cursor position (before modal)
          if (canInsertHere && start !== null && end !== null && initialContent !== null) {
            const newContent = initialContent.substring(0, start) +
              '\n' + result.markdownLink + '\n' +
              initialContent.substring(end);
            setEditContent(newContent);

            // Restore focus and cursor when possible
            setTimeout(() => {
              const textarea = getTargetTextarea ? getTargetTextarea() : initialTextarea;
              if (textarea) {
                textarea.focus();
                const newPos = start + result.markdownLink.length + 2; // +2 for the newlines
                textarea.setSelectionRange(newPos, newPos);
              }
            }, 0);
          } else {
            // Fallback: append to end of content if we lost the focus element
            const currentContent = selectedNote?.content || '';
            setEditContent(currentContent + '\n' + result.markdownLink + '\n');
          }
          return true;
        }
      }
    }
    return false;
  }, [uploadPastedImage, setEditContent, getTargetTextarea]);

  return {
    handlePasteImage,
    uploadPastedImage
  };
}; 