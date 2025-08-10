export const startEdit = (
  selectedNote: any,
  setIsEditing: (editing: boolean) => void,
  setEditTitle: (title: string) => void,
  setEditContent: (content: string) => void,
  setIsSplitMode: (split: boolean) => void
) => {
  if (!selectedNote) return;
  
  // Capture current scroll position from ALL possible containers
  const containers = document.querySelectorAll('.overflow-y-auto, .preview-content');
  let scrollPosition = 0;
  let sourceContainer: HTMLElement | null = null;
  
  // Find the container with the highest scroll position (most likely the main content)
  containers.forEach((container) => {
    const containerEl = container as HTMLElement;
    if (containerEl.scrollTop > scrollPosition) {
      scrollPosition = containerEl.scrollTop;
      sourceContainer = containerEl;
    }
  });
  
  console.log('Captured scroll position:', scrollPosition, 'from container:', sourceContainer);
  console.log('All containers found:', containers.length);
  
  // Also store the scroll position in sessionStorage as backup
  sessionStorage.setItem('note-scroll-position', scrollPosition.toString());
  
  setIsEditing(true);
  setEditTitle(selectedNote.title);
  setEditContent(selectedNote.content);
  
  // Auto-enable split mode only on desktop (large screens)
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    setIsSplitMode(true);
  }
  
  // Restore scroll position using a more robust approach
  const restoreScrollPosition = () => {
    console.log('Attempting to restore scroll position:', scrollPosition);
    
    // Try to find the appropriate container based on the mode
    let targetContainer: HTMLElement | null = null;
    
    // For split mode, target the preview side
    const splitPreviewContainer = document.querySelector('.preview-content') as HTMLElement;
    if (splitPreviewContainer) {
      targetContainer = splitPreviewContainer;
      console.log('Found split preview container');
    } else {
      // For regular edit mode, target the overflow container
      // Try to find the most specific container first
      const mainContentContainer = document.querySelector('.flex-1.overflow-y-auto') as HTMLElement;
      if (mainContentContainer) {
        targetContainer = mainContentContainer;
        console.log('Found main content container');
      } else {
        targetContainer = document.querySelector('.overflow-y-auto') as HTMLElement;
        console.log('Found regular overflow container');
      }
    }
    
    if (targetContainer) {
      console.log('Setting scrollTop to:', scrollPosition, 'on container:', targetContainer);
      targetContainer.scrollTop = scrollPosition;
      
      // For split mode, also set the textarea scroll position to trigger sync
      if (splitPreviewContainer) {
        const textarea = document.querySelector('.raw-content') as HTMLTextAreaElement;
        if (textarea) {
          const maxScroll = textarea.scrollHeight - textarea.clientHeight;
          if (maxScroll > 0) {
            const scrollRatio = scrollPosition / (sourceContainer?.scrollHeight || 1);
            const targetScrollTop = scrollRatio * maxScroll;
            textarea.scrollTop = targetScrollTop;
            console.log('Set textarea scroll position to trigger sync:', targetScrollTop);
          }
        }
      }
      
      // Verify the scroll position was set correctly
      setTimeout(() => {
        console.log('Verified scroll position:', targetContainer?.scrollTop, 'expected:', scrollPosition);
      }, 50);
      
      return true;
    } else {
      console.log('No target container found, trying fallback');
      // Fallback: try to restore from sessionStorage
      const storedPosition = sessionStorage.getItem('note-scroll-position');
      if (storedPosition) {
        const fallbackContainer = document.querySelector('.overflow-y-auto, .preview-content') as HTMLElement;
        if (fallbackContainer) {
          fallbackContainer.scrollTop = parseInt(storedPosition, 10);
          console.log('Used fallback container, set scrollTop to:', storedPosition);
          return true;
        }
      }
      return false;
    }
  };

  // Try to restore with multiple attempts
  let attempts = 0;
  const maxAttempts = 10;
  
  const attemptRestore = () => {
    attempts++;
    console.log(`Restore attempt ${attempts}/${maxAttempts}`);
    
    if (restoreScrollPosition()) {
      console.log('Scroll position restored successfully');
      return;
    }
    
    if (attempts < maxAttempts) {
      setTimeout(attemptRestore, 100);
    } else {
      console.log('Failed to restore scroll position after all attempts');
    }
  };
  
  // Start the restoration attempts
  attemptRestore();
  
  // Additional attempt for split mode after the sync system has settled
  setTimeout(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const splitPreviewContainer = document.querySelector('.preview-content') as HTMLElement;
      if (splitPreviewContainer && Math.abs(splitPreviewContainer.scrollTop - scrollPosition) > 10) {
        console.log('Final split mode scroll correction');
        splitPreviewContainer.scrollTop = scrollPosition;
      }
    }
  }, 500);
};

export const cancelEdit = (
  setIsEditing: (editing: boolean) => void,
  setEditTitle: (title: string) => void,
  setEditContent: (content: string) => void,
  setIsSplitMode: (split: boolean) => void
) => {
  setIsEditing(false);
  setEditTitle('');
  setEditContent('');
  // Disable split mode when canceling
  setIsSplitMode(false);
  // Clean up stored scroll position
  sessionStorage.removeItem('note-scroll-position');
};

export const closeNote = (
  setSelectedNote: (note: any) => void,
  setEditTitle: (title: string) => void,
  setEditContent: (content: string) => void,
  setIsEditing: (editing: boolean) => void,
  setIsSplitMode: (split: boolean) => void
) => {
  setSelectedNote(null);
  setEditTitle('');
  setEditContent('');
  setIsEditing(false);
  setIsSplitMode(false);
  // Remove from localStorage
  localStorage.removeItem('selected-note-id');
}; 