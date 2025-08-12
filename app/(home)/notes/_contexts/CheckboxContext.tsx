import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

interface CheckboxContextType {
  updateCheckbox: (lineIndex: number, newChecked: boolean) => void;
  getCurrentContent: () => string;
}

const CheckboxContext = createContext<CheckboxContextType | null>(null);

interface CheckboxProviderProps {
  children: ReactNode;
  selectedNote: any;
  setNotes: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<any | null>>;
  isSignedIn: boolean;
  // When provided (e.g., in split editor), also update the editor content
  setEditContent?: (content: string) => void;
  // Optional live content override (e.g., current editor text)
  currentContent?: string;
  driveService?: {
    updateFile: (fileId: string, content: string) => Promise<void>;
  };
}

export const CheckboxProvider: React.FC<CheckboxProviderProps> = ({
  children,
  selectedNote,
  setNotes,
  setSelectedNote,
  isSignedIn,
  setEditContent,
  currentContent,
  driveService
}) => {
  // Use ref to store the latest content without causing re-renders
  const contentRef = useRef<string>(selectedNote?.content || '');

  // Keep ref in sync with the best available source of truth
  React.useEffect(() => {
    if (typeof currentContent === 'string') {
      if (contentRef.current !== currentContent) contentRef.current = currentContent;
      return;
    }
    if (selectedNote && typeof selectedNote.content === 'string') {
      if (contentRef.current !== selectedNote.content) contentRef.current = selectedNote.content;
    }
  }, [currentContent, selectedNote?.content]);

  const updateCheckbox = useCallback((lineIndex: number, newChecked: boolean) => {
    if (!selectedNote) return;

    const currentContent = contentRef.current;
    
    // Split preserving all lines, including trailing empty lines
    const matchLines = currentContent.match(/[^\n]*\n?|$/g);
    const lines = matchLines ? matchLines.slice(0, -1) : [];
    
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return;
    }
    
    const line = lines[lineIndex].replace(/\r?\n$/, '');
    const checkboxMatch = line.match(/^(\s*)-\s*\[[ xX]?\]\s*(.*)$/);
    if (checkboxMatch) {
      const [, indent, lineText] = checkboxMatch;
      const newLine = `${indent}- [${newChecked ? 'x' : ' '}] ${lineText}` + (lines[lineIndex].endsWith('\n') ? '\n' : '');
      lines[lineIndex] = newLine;
      const updatedContent = lines.join('');
      
      // Update ref immediately
      contentRef.current = updatedContent;
      
      // Prepare updated note (avoid changing object identity used widely)
      const updatedNote = {
        ...selectedNote,
        content: updatedContent,
        updatedAt: new Date().toISOString()
      };

      // Update notes list so persistence and other views receive the change
      setNotes(prev => prev.map(note => (note.id === selectedNote.id ? updatedNote : note)));

      // Also mutate the selectedNote in place so consumers reading it directly (e.g., startEdit)
      // see the latest content without forcing a re-render (prevents image remounts in preview).
      try {
        (selectedNote as any).content = updatedContent;
        (selectedNote as any).updatedAt = updatedNote.updatedAt;
      } catch {}

      // If an editor is present (split mode), update the raw editor text too
      if (typeof setEditContent === 'function') {
        try { setEditContent(updatedContent); } catch {}
      }

      // Important: don't call setSelectedNote(updatedNote) here to avoid
      // replacing the object and triggering a full markdown re-render which
      // unmounts/remounts images. The NotePreview uses MemoizedMarkdown with
      // props that depend on selectedNote; keeping identity stable reduces churn.
      
      // Sync with Drive if signed in
  if (isSignedIn && selectedNote.driveFileId && driveService) {
        driveService.updateFile(selectedNote.driveFileId, updatedContent)
          .catch((error: unknown) => console.error('Failed to update checkbox in Drive:', error));
      }
    }
  }, [selectedNote, setNotes, setSelectedNote, isSignedIn, driveService, setEditContent]);

  const getCurrentContent = useCallback(() => {
    return contentRef.current;
  }, []);

  return (
    <CheckboxContext.Provider value={{ updateCheckbox, getCurrentContent }}>
      {children}
    </CheckboxContext.Provider>
  );
};

export const useCheckbox = () => {
  const context = useContext(CheckboxContext);
  if (!context) {
    throw new Error('useCheckbox must be used within a CheckboxProvider');
  }
  return context;
};
