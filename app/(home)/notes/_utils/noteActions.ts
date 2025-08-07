export const startEdit = (
  selectedNote: any,
  setIsEditing: (editing: boolean) => void,
  setEditTitle: (title: string) => void,
  setEditContent: (content: string) => void,
  setIsSplitMode: (split: boolean) => void
) => {
  if (!selectedNote) return;
  setIsEditing(true);
  setEditTitle(selectedNote.title);
  setEditContent(selectedNote.content);
  // Auto-enable split mode only on desktop (large screens)
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    setIsSplitMode(true);
  }
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