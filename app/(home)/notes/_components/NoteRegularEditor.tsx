'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { usePasteImage } from '../_hooks/usePasteImage';
import { Note, Folder } from './types';
import RenameImageDialog from './RenameImageDialog';

interface NoteRegularEditorProps {
  editContent: string;
  setEditContent: (content: string) => void;
  tabSize?: number;
  fontSize?: string;
  notes: Note[];
  folders: Folder[];
  selectedNote: Note | null;
  setIsLoading: (loading: boolean) => void;
  setSyncProgress: (progress: number) => void;
}

export const NoteRegularEditor: React.FC<NoteRegularEditorProps> = ({
  editContent,
  setEditContent,
  tabSize = 2,
  fontSize = '16px',
  notes,
  folders,
  selectedNote,
  setIsLoading,
  setSyncProgress
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [renameModal, setRenameModal] = useState<{ open: boolean; defaultName: string } | null>(null);



 

  // Initialize paste image functionality
  const { handlePasteImage } = usePasteImage({
    notes,
    folders,
    selectedNote,
    setEditContent,
    setIsLoading,
    setSyncProgress,
    onBeforeUpload: async (defaultFilename) => {
      return await new Promise<string | null>((resolve) => {
        setRenameModal({ open: true, defaultName: defaultFilename });
        const handle = (newName: string | null) => {
          setRenameModal(null);
          resolve(newName);
        };
        // Attach a one-off handler through state closure below by rendering dialog
        (window as any).__rename_image_cb__ = handle;
      });
    },
    getTargetTextarea: () => textareaRef.current
  });

  // Add paste event listener to textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handlePaste = async (event: ClipboardEvent) => {
      const handled = await handlePasteImage(event);
      if (handled) {
        // Image was pasted and handled, don't do default paste
        return;
      }
      // If no image was found, let the default paste behavior continue
    };

    textarea.addEventListener('paste', handlePaste);
    return () => {
      textarea.removeEventListener('paste', handlePaste);
    };
  }, [handlePasteImage]);

  // Debounced renumbering to avoid excessive calls
  const renumberTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to renumber consecutive numbered lists (optimized)
  const renumberNumberedLists = useCallback((content: string, preserveCursor?: { start: number; end: number }): { content: string; cursorAdjustment: number } => {
    const lines = content.split('\n');
    const updatedLines = [...lines];
    const totalAdjustment = 0;
    let cursorLineAdjustment = 0;
    
    // Track which lines we've already processed to avoid double-processing
    const processedLines = new Set<number>();
    
    for (let i = 0; i < lines.length; i++) {
      if (processedLines.has(i)) continue;
      
      const line = lines[i];
      const numberedMatch = line.match(/^(\s*)(\d+)\.\s/);
      
      if (numberedMatch) {
        // Found a numbered list item, check if renumbering is needed
        const baseIndentation = numberedMatch[1];
        let currentNumber = 1;
        let needsRenumbering = false;
        const listItems: number[] = [];
        
        // First pass: collect all list items and check if renumbering is needed
        for (let j = i; j < lines.length; j++) {
          const currentLine = lines[j];
          const currentMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
          
          if (currentMatch && currentMatch[1] === baseIndentation) {
            listItems.push(j);
            const actualNumber = parseInt(currentMatch[2]);
            if (actualNumber !== currentNumber) {
              needsRenumbering = true;
            }
            currentNumber++;
          } else if (currentLine.trim() === '') {
            continue;
          } else if (currentMatch && currentMatch[1].length > baseIndentation.length) {
            continue;
          } else {
            break;
          }
        }
        
        // Only renumber if actually needed
        if (needsRenumbering) {
          let newNumber = 1;
          for (const lineIndex of listItems) {
            processedLines.add(lineIndex);
            const currentLine = lines[lineIndex];
            const currentMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
            
            if (currentMatch) {
              const oldNumber = currentMatch[2];
              const newNumberStr = newNumber.toString();
              const restOfLine = currentLine.substring(currentMatch[0].length);
              const newLine = baseIndentation + newNumberStr + '. ' + restOfLine;
              
              updatedLines[lineIndex] = newLine;
              
              // Track cursor position adjustment if needed
              if (preserveCursor && lineIndex <= preserveCursor.start) {
                const lengthDiff = newNumberStr.length - oldNumber.length;
                if (lineIndex === preserveCursor.start) {
                  cursorLineAdjustment += lengthDiff;
                }
              }
              
              newNumber++;
            }
          }
        }
        
        // Skip the lines we just processed
        i = Math.max(i, ...listItems);
      }
    }
    
    return { 
      content: updatedLines.join('\n'), 
      cursorAdjustment: cursorLineAdjustment 
    };
  }, []);

  // Optimized content change handler with debouncing
  const handleContentChange = useCallback((newContent: string) => {
    // Immediately update content for responsive feel
    setEditContent(newContent);
    
    // Debounced renumbering for performance
    if (renumberTimeoutRef.current) {
      clearTimeout(renumberTimeoutRef.current);
    }
    
    // Only schedule renumbering if content contains numbered lists
    if (/^\s*\d+\.\s/m.test(newContent)) {
      renumberTimeoutRef.current = setTimeout(() => {
        const textarea = textareaRef.current;
        const cursorPos = textarea ? { start: textarea.selectionStart, end: textarea.selectionEnd } : undefined;
        
        const result = renumberNumberedLists(newContent, cursorPos);
        
        // Only update if content actually changed
        if (result.content !== newContent) {
          setEditContent(result.content);
          
          // Restore cursor position with adjustment
          if (textarea && cursorPos) {
            setTimeout(() => {
              const newStart = cursorPos.start + result.cursorAdjustment;
              const newEnd = cursorPos.end + result.cursorAdjustment;
              textarea.setSelectionRange(newStart, newEnd);
            }, 0);
          }
        }
      }, 300); // 300ms debounce for smooth experience
    }
  }, [renumberNumberedLists]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (renumberTimeoutRef.current) {
        clearTimeout(renumberTimeoutRef.current);
      }
    };
  }, []);

  // Ensure textarea is properly initialized for browser compatibility
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Ensure textarea is properly set up for editing
      textarea.setAttribute('spellcheck', 'false');
      textarea.setAttribute('autocomplete', 'off');
      textarea.setAttribute('autocorrect', 'off');
      textarea.setAttribute('autocapitalize', 'off');
      
      // Force focus to ensure it's editable
      if (document.activeElement !== textarea) {
        textarea.focus();
      }
    }
  }, [editContent]);

  // Handle Tab key, auto bracket/quote, auto bullet, etc.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = ' '.repeat(tabSize);
      setEditContent(value.slice(0, start) + indent + value.slice(end));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
      return;
    }
    
    // Auto close brackets/quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
    };
    if (Object.keys(pairs).includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const close = pairs[e.key];
      setEditContent(value.slice(0, start) + e.key + close + value.slice(end));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
      return;
    }
    
    // Auto continue bullet/checkbox list
    if (e.key === 'Enter') {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.slice(lineStart);
      
      // Continue checkbox: always insert '- [ ] '
      const checkboxMatch = currentLine.match(/^(\s*)- \[[ xX]?\] /);
      if (checkboxMatch) {
        e.preventDefault();
        const prefix = checkboxMatch[1] + '- [ ] ';
        setEditContent(value.slice(0, start) + '\n' + prefix + value.slice(end));
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
        return;
      }
      
      // Bullet: - , * , + , numbered list
      const bulletMatch = currentLine.match(/^(\s*)([-*+] |\d+\. )/);
      if (bulletMatch) {
        e.preventDefault();
        
        // Check if this is a numbered list
        const numberedMatch = bulletMatch[2].match(/(\d+)\./);
        if (numberedMatch) {
          // This is a numbered list - we need to renumber subsequent items
          const currentNumber = parseInt(numberedMatch[1]);
          const nextNumber = currentNumber + 1;
          const prefix = bulletMatch[1] + nextNumber + '. ';
          
          // Insert the new line with the next number
          const newContent = value.slice(0, start) + '\n' + prefix + value.slice(end);
          
          // Now renumber all subsequent numbered list items
          const lines = newContent.split('\n');
          const updatedLines = [...lines];
          let numberToUse = nextNumber + 1;
          
          // Find the line we just inserted and start from the next line
          const insertedLineIndex = before.split('\n').length; // Line index where we inserted
          
          for (let i = insertedLineIndex + 1; i < updatedLines.length; i++) {
            const line = updatedLines[i];
            const lineNumberMatch = line.match(/^(\s*)(\d+)\.\s/);
            if (lineNumberMatch) {
              // This line is a numbered list item - update its number
              const indentation = lineNumberMatch[1];
              const restOfLine = line.substring(lineNumberMatch[0].length);
              updatedLines[i] = indentation + numberToUse + '. ' + restOfLine;
              numberToUse++;
            } else if (line.trim() !== '' && !line.match(/^(\s*)([-*+] |\d+\. )/)) {
              // If we hit a non-list line that's not empty, stop renumbering
              break;
            }
          }
          
          const finalContent = updatedLines.join('\n');
          setEditContent(finalContent);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
          }, 0);
        } else {
          // Regular bullet list (-, *, +)
          const prefix = bulletMatch[1] + bulletMatch[2];
          setEditContent(
            value.slice(0, start) + '\n' + prefix + value.slice(end)
          );
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
          }, 0);
        }
        return;
      }
    }
    
    // For all other keys, ensure they work normally
    // Don't prevent default for normal text input
  };
  
  return (
    <div className="flex flex-col h-full bg-secondary">
      {renameModal?.open && (
        <RenameImageDialog
          isOpen={renameModal.open}
          defaultName={renameModal.defaultName}
          onConfirm={(newName) => {
            const cb = (window as any).__rename_image_cb__ as (n: string | null) => void;
            if (cb) cb(newName);
          }}
          onOpenChange={(open) => {
            if (!open) {
              const cb = (window as any).__rename_image_cb__ as (n: string | null) => void;
              if (cb) cb(null);
            }
          }}
        />
      )}
      <EditorToolbar 
        editContent={editContent} 
        setEditContent={setEditContent}
        textareaRef={textareaRef}
        onPasteImage={() => {
          // Trigger paste event on textarea
          if (textareaRef.current) {
            textareaRef.current.focus();
            document.execCommand('paste');
          }
        }}
      />
      <div className="flex-1 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-6 relative">
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            // Ensure proper focus handling for browser compatibility
            e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
          }}
          className="w-full h-full resize-none bg-secondary text-gray-300 focus:outline-none font-mono text-sm"
          placeholder="Write your note in Markdown... (Paste images with Ctrl+V)"
          style={{ 
            backgroundColor: '#31363F',
            fontSize: fontSize
          }}
        />
      </div>
    </div>
  );
};
