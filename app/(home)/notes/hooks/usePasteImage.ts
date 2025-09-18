import { useCallback } from 'react';
import { useDrive } from '../../../lib/driveContext';
import { driveService } from '../../../lib/googleDrive';
import { Note } from '../components/types';

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

      // Get the Images folder ID - this will create the folder if it doesn't exist
      const imagesFolderId = await driveService.findOrCreateImagesFolder();

      setSyncProgress(30);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = imageFile.name.split('.')?.pop()?.toLowerCase() || 'png';
      const defaultFilename = `image-${timestamp}.${extension}`;

      // Allow caller to prompt user for a custom name
      let finalFilename = defaultFilename;
      if (onBeforeUpload) {
        try {
          const maybeNew = await onBeforeUpload(defaultFilename, imageFile);
          if (maybeNew && typeof maybeNew === 'string') {
            // Ensure extension is preserved
            const provided = maybeNew.trim();
            if (provided) {
              finalFilename = provided.endsWith(`.${extension}`)
                ? provided
                : `${provided}.${extension}`;
            }
          }
        } catch (_) {
          // Ignore and keep default filename
        }
      }

      setSyncProgress(50);

      // Upload image to Google Drive in the Images folder
      const imageFileId = await driveService.uploadImage(finalFilename, imageFile, imagesFolderId);

      setSyncProgress(80);

      // Create shareable URL for the image - use direct access format
      const imageUrl = `https://drive.google.com/uc?id=${imageFileId}`;
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
  }, [selectedNote, isSignedIn, setIsLoading, setSyncProgress]);

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