import { useState, useEffect, useCallback } from 'react';
import { Note } from '../_components/types';
import { suggestNoteLinks } from '../_utils/backlinkUtils';

interface WikilinkAutocompleteState {
  isOpen: boolean;
  suggestions: Note[];
  query: string;
  position: { top: number; left: number } | null;
  selectedIndex: number;
}

interface UseWikilinkAutocompleteProps {
  notes: Note[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  editContent: string;
  setEditContent: (content: string) => void;
}

export const useWikilinkAutocomplete = ({
  notes,
  textareaRef,
  editContent,
  setEditContent
}: UseWikilinkAutocompleteProps) => {
  const [autocompleteState, setAutocompleteState] = useState<WikilinkAutocompleteState>({
    isOpen: false,
    suggestions: [],
    query: '',
    position: null,
    selectedIndex: 0
  });

  // Check if cursor is inside a wikilink pattern
  const checkWikilinkContext = useCallback((text: string, cursorPos: number) => {
    // Look for [[ before cursor and ]] after cursor or at end
    const beforeCursor = text.slice(0, cursorPos);
    const afterCursor = text.slice(cursorPos);
    
    // Find the last [[ before cursor
    const lastOpenBrackets = beforeCursor.lastIndexOf('[[');
    if (lastOpenBrackets === -1) return null;
    
    // Check if there's a ]] between the [[ and cursor
    const textBetween = beforeCursor.slice(lastOpenBrackets + 2);
    if (textBetween.includes(']]')) return null;
    
    // Check if there's a ]] in the text after cursor (optional, for incomplete links)
    const nextCloseBrackets = afterCursor.indexOf(']]');
    
    return {
      start: lastOpenBrackets,
      end: nextCloseBrackets !== -1 ? cursorPos + nextCloseBrackets + 2 : cursorPos,
      query: textBetween,
      isComplete: nextCloseBrackets !== -1
    };
  }, []);

  // Handle input changes and cursor movement
  const handleInputChange = useCallback((newContent: string, cursorPos?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const actualCursorPos = cursorPos ?? textarea.selectionStart ?? 0;
    const wikilinkContext = checkWikilinkContext(newContent, actualCursorPos);

    if (wikilinkContext) {
      // Show autocomplete
      const suggestions = suggestNoteLinks(wikilinkContext.query, notes, 8);
      
      // Calculate position for autocomplete dropdown
      const textBeforeCursor = newContent.slice(0, actualCursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const charInLine = lines[lines.length - 1].length;
      
      // Rough estimation of position (would need more precise calculation in real implementation)
      const lineHeight = 20; // Approximate line height
      const charWidth = 8; // Approximate character width
      
      setAutocompleteState({
        isOpen: true,
        suggestions,
        query: wikilinkContext.query,
        position: {
          top: currentLine * lineHeight + 100,
          left: charInLine * charWidth
        },
        selectedIndex: 0
      });
    } else {
      // Hide autocomplete
      setAutocompleteState(prev => ({ ...prev, isOpen: false }));
    }
  }, [notes, textareaRef, checkWikilinkContext]);

  // Insert selected suggestion
  const insertSuggestion = useCallback((note: Note) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? 0;
    const wikilinkContext = checkWikilinkContext(editContent, cursorPos);
    
    if (wikilinkContext) {
      const beforeLink = editContent.slice(0, wikilinkContext.start);
      const afterLink = editContent.slice(wikilinkContext.end);
      const newContent = `${beforeLink}[[${note.title}]]${afterLink}`;
      
      setEditContent(newContent);
      setAutocompleteState(prev => ({ ...prev, isOpen: false }));
      
      // Set cursor position after the inserted link
      setTimeout(() => {
        const newCursorPos = wikilinkContext.start + `[[${note.title}]]`.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  }, [editContent, setEditContent, textareaRef, checkWikilinkContext]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!autocompleteState.isOpen) return false;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setAutocompleteState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.suggestions.length - 1)
        }));
        return true;
        
      case 'ArrowUp':
        e.preventDefault();
        setAutocompleteState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        return true;
        
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (autocompleteState.suggestions[autocompleteState.selectedIndex]) {
          insertSuggestion(autocompleteState.suggestions[autocompleteState.selectedIndex]);
        }
        return true;
        
      case 'Escape':
        e.preventDefault();
        setAutocompleteState(prev => ({ ...prev, isOpen: false }));
        return true;
        
      default:
        return false;
    }
  }, [autocompleteState, insertSuggestion]);

  // Listen for textarea events
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleTextareaInput = (e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      handleInputChange(target.value);
    };

    const handleTextareaKeyDown = (e: KeyboardEvent) => {
      const handled = handleKeyDown(e);
      if (handled) {
        e.stopPropagation();
      }
    };

    const handleTextareaClick = () => {
      handleInputChange(editContent);
    };

    textarea.addEventListener('input', handleTextareaInput);
    textarea.addEventListener('keydown', handleTextareaKeyDown);
    textarea.addEventListener('click', handleTextareaClick);

    return () => {
      textarea.removeEventListener('input', handleTextareaInput);
      textarea.removeEventListener('keydown', handleTextareaKeyDown);
      textarea.removeEventListener('click', handleTextareaClick);
    };
  }, [textareaRef, handleInputChange, handleKeyDown, editContent]);

  return {
    autocompleteState,
    insertSuggestion,
    closeAutocomplete: () => setAutocompleteState(prev => ({ ...prev, isOpen: false }))
  };
};
