import { useEffect } from 'react';

export const useKeyboardShortcuts = (
  isEditing: boolean,
  isSplitMode: boolean,
  selectedNote: any,
  setIsEditing: (editing: boolean) => void,
  setIsSplitMode: (split: boolean) => void,
  setIsCreatingNote: (creating: boolean) => void,
  deleteNote: (noteId: string) => void,
  createNoteFromCurrentContent: () => void,
  saveNote: () => void,
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      // Ctrl/Cmd + S to save note (only when editing)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing) {
          saveNote();
        }
      }

      // Ctrl/Cmd + E to toggle edit mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setIsEditing(!isEditing);
      }

      // Ctrl/Cmd + \ to toggle split mode (only in edit mode and on desktop)
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        if (isEditing && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setIsSplitMode(!isSplitMode);
        }
      }

      // Ctrl/Cmd + Shift + S to toggle split mode (legacy, desktop only)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (isEditing && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setIsSplitMode(!isSplitMode);
        }
      }

      // Ctrl/Cmd + N to create new note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (e.shiftKey) {
          // Ctrl/Cmd + Shift + N to create note from current content
          createNoteFromCurrentContent();
        } else {
          setIsCreatingNote(true);
        }
      }

      // Delete key to delete selected note
      if (e.key === 'Delete' && selectedNote && !isEditing) {
        e.preventDefault();
        if (confirm('Are you sure you want to delete this note?')) {
          deleteNote(selectedNote.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, isSplitMode, selectedNote, setIsEditing, setIsSplitMode, setIsCreatingNote, deleteNote, createNoteFromCurrentContent]);
}; 