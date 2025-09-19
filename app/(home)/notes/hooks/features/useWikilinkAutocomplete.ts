import { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '../../components/types';
import { suggestNoteLinks } from '../../utils/navigation/backlinkUtils';

interface WikilinkAutocompleteState {
  isOpen: boolean;
  suggestions: Note[];
  query: string;
  position: { top: number; left: number } | null;
  selectedIndex: number;
}

interface UseWikilinkAutocompleteProps {
  notes: Note[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
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

  const lastInputTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  // Improved wikilink context detection
  const checkWikilinkContext = useCallback((text: string, cursorPos: number) => {
    if (cursorPos === 0) return null;

    const beforeCursor = text.slice(0, cursorPos);
    const afterCursor = text.slice(cursorPos);
    
    // Find the last [[ before cursor
    const lastOpenBrackets = beforeCursor.lastIndexOf('[[');
    if (lastOpenBrackets === -1) return null;
    
    // Check if there's already a ]] between [[ and cursor
    const textBetween = beforeCursor.slice(lastOpenBrackets + 2);
    if (textBetween.includes(']]')) return null;
    
    // Ensure cursor is actually inside the brackets (not just after [[)
    if (cursorPos <= lastOpenBrackets + 2) return null;
    
    // Get the query text (what's between [[ and cursor)
    const query = textBetween;
    
    // Sanity checks
    if (query.length > 50) return null; // Don't show for very long queries
    if (query.includes('\n')) return null; // Don't show if query spans multiple lines
    
    // Check if there's a ]] after cursor (optional)
    const nextCloseBrackets = afterCursor.indexOf(']]');
    
    return {
      start: lastOpenBrackets,
      end: nextCloseBrackets !== -1 ? cursorPos + nextCloseBrackets + 2 : cursorPos,
      query: query,
      isComplete: nextCloseBrackets !== -1
    };
  }, []);

  // Calculate dropdown position based on cursor
  const calculatePosition = useCallback((textarea: HTMLTextAreaElement, cursorPos: number) => {
    try {
      // Create a temporary element to measure text dimensions
      const temp = document.createElement('div');
      temp.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: auto;
        height: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: ${getComputedStyle(textarea).fontFamily};
        font-size: ${getComputedStyle(textarea).fontSize};
        line-height: ${getComputedStyle(textarea).lineHeight};
        padding: ${getComputedStyle(textarea).padding};
        border: ${getComputedStyle(textarea).border};
        box-sizing: border-box;
      `;
      
      // Get text before cursor
      const textBeforeCursor = textarea.value.slice(0, cursorPos);
      temp.textContent = textBeforeCursor;
      document.body.appendChild(temp);
      
      // Calculate position
      const rect = textarea.getBoundingClientRect();
      const tempRect = temp.getBoundingClientRect();
      
      // Clean up
      document.body.removeChild(temp);
      
      // Calculate line and character position
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const charInLine = lines[lines.length - 1].length;
      
      // Estimate position (fallback if measurement fails)
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const charWidth = 8; // Approximate character width
      
      const top = rect.top + (currentLine * lineHeight) + lineHeight + 5;
      const left = rect.left + (charInLine * charWidth) + 10;
      
      return { top, left };
    } catch (error) {
      // Fallback to simple calculation
      const rect = textarea.getBoundingClientRect();
      const textBeforeCursor = textarea.value.slice(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const charInLine = lines[lines.length - 1].length;
      
      const lineHeight = 20;
      const charWidth = 8;
      
      return {
        top: rect.top + (currentLine * lineHeight) + lineHeight + 5,
        left: rect.left + (charInLine * charWidth) + 10
      };
    }
  }, []);

  // Handle input changes with debouncing
  const handleInputChange = useCallback((newContent: string, cursorPos?: number) => {
    if (isProcessingRef.current) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const actualCursorPos = cursorPos ?? textarea.selectionStart ?? 0;
    const now = Date.now();
    
    // Debounce rapid input changes
    if (now - lastInputTimeRef.current < 50) {
      return;
    }
    lastInputTimeRef.current = now;

    const wikilinkContext = checkWikilinkContext(newContent, actualCursorPos);

    if (wikilinkContext && wikilinkContext.query.trim()) {
      // Show autocomplete
      const suggestions = suggestNoteLinks(wikilinkContext.query, notes, 8);
      
      if (suggestions.length > 0) {
        const position = calculatePosition(textarea, actualCursorPos);
        
        setAutocompleteState({
          isOpen: true,
          suggestions,
          query: wikilinkContext.query,
          position,
          selectedIndex: 0
        });
      } else {
        setAutocompleteState(prev => ({ ...prev, isOpen: false }));
      }
    } else {
      // Hide autocomplete
      setAutocompleteState(prev => ({ ...prev, isOpen: false }));
    }
  }, [notes, textareaRef, checkWikilinkContext, calculatePosition]);

  // Insert selected suggestion
  const insertSuggestion = useCallback((note: Note) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    isProcessingRef.current = true;
    
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
        isProcessingRef.current = false;
      }, 0);
    } else {
      isProcessingRef.current = false;
    }
  }, [editContent, setEditContent, textareaRef, checkWikilinkContext]);

  // Handle keyboard navigation (only when autocomplete is open)
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
      // Only handle autocomplete keys if autocomplete is open
      if (autocompleteState.isOpen) {
        const handled = handleKeyDown(e);
        if (handled) {
          e.stopPropagation();
          return;
        }
      }
      // For all other keys, let them pass through normally
    };

    const handleTextareaClick = () => {
      // Update autocomplete position on click
      if (autocompleteState.isOpen) {
        handleInputChange(editContent);
      }
    };

    const handleTextareaScroll = () => {
      // Update autocomplete position on scroll
      if (autocompleteState.isOpen) {
        handleInputChange(editContent);
      }
    };

    textarea.addEventListener('input', handleTextareaInput);
    textarea.addEventListener('keydown', handleTextareaKeyDown);
    textarea.addEventListener('click', handleTextareaClick);
    textarea.addEventListener('scroll', handleTextareaScroll);

    return () => {
      textarea.removeEventListener('input', handleTextareaInput);
      textarea.removeEventListener('keydown', handleTextareaKeyDown);
      textarea.removeEventListener('click', handleTextareaClick);
      textarea.removeEventListener('scroll', handleTextareaScroll);
    };
  }, [textareaRef, handleInputChange, handleKeyDown, editContent, autocompleteState.isOpen]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    if (!autocompleteState.isOpen) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textarea = textareaRef.current;
      
      // Don't close if clicking on the textarea or autocomplete dropdown
      if (textarea?.contains(target) || target.closest('[data-wikilink-autocomplete]')) {
        return;
      }
      
      setAutocompleteState(prev => ({ ...prev, isOpen: false }));
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [autocompleteState.isOpen, textareaRef]);

  return {
    autocompleteState,
    insertSuggestion,
    closeAutocomplete: () => setAutocompleteState(prev => ({ ...prev, isOpen: false }))
  };
};
