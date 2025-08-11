'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { usePasteImage, useTableToolbar } from '../_hooks';
import { Note, Folder } from './types';
import RenameImageDialog from './RenameImageDialog';
import CMEditor, { CMEditorApi } from './CMEditor';

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
  const cmRef = useRef<CMEditorApi | undefined>(undefined);
  const [renameModal, setRenameModal] = useState<{ open: boolean; defaultName: string } | null>(null);

  // Initialize table toolbar
  const { isInTable, handleTableAction, handleCursorMove } = useTableToolbar(cmRef);



 

  // Initialize paste image functionality
  const { handlePasteImage, uploadPastedImage } = usePasteImage({
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
    getTargetTextarea: () => null
  });
  // CMEditor handles paste internally via onPasteImage

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
    const result = renumberNumberedLists(newContent, undefined);
        
        // Only update if content actually changed
        if (result.content !== newContent) {
          setEditContent(result.content);
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

  // No-op: CMEditor manages focus

  // Handle Tab key, auto bracket/quote, auto bullet, etc.
  // Key handling moved into CMEditor / CodeMirror behavior
  
  return (
    <div className="flex flex-col h-full min-h-0 bg-secondary">
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
        textareaRef={undefined as any}
        cmApiRef={cmRef as any}
        onPasteImage={async () => {
          // No direct programmatic paste; rely on OS paste. As a convenience, focus editor.
          cmRef.current?.focus();
        }}
        isInTable={isInTable}
        onTableAction={handleTableAction}
      />
      <div className="flex-1 min-h-0 relative p-0">
        <CMEditor
          ref={cmRef as any}
          value={editContent}
          onChange={handleContentChange}
          tabSize={tabSize}
          fontSize={fontSize}
          className="w-full h-full"
          onReady={(api) => {
            // ensure focus for immediate typing
            api.focus();
          }}
          onPasteImage={async (file) => {
            const result = await uploadPastedImage(file);
            return result?.markdownLink ?? null;
          }}
          onCursorMove={handleCursorMove}
        />
      </div>
    </div>
  );
};
