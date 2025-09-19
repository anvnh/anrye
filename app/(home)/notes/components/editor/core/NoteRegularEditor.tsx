'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { EditorToolbar } from '../toolbar/EditorToolbar';
import { usePasteImage, useTableToolbar } from '../../../hooks';
import { Note } from '../../types';
import RenameImageDialog from '../../images/editing/RenameImageDialog';
import CMEditor, { CMEditorApi } from './CMEditor';
import { AIFloatingInput } from '../../ai/AIFloatingInput';

interface NoteRegularEditorProps {
  editContent: string;
  setEditContent: (content: string) => void;
  tabSize?: number;
  fontSize?: string;
  codeBlockFontSize?: string;
  notes: Note[];
  selectedNote: Note | null;
  setIsLoading: (loading: boolean) => void;
  setSyncProgress: (progress: number) => void;
}

export const NoteRegularEditor: React.FC<NoteRegularEditorProps> = ({
  editContent,
  setEditContent,
  tabSize = 2,
  fontSize = '16px',
  codeBlockFontSize = '14px',
  notes,
  selectedNote,
  setIsLoading,
  setSyncProgress
}) => {
  const cmRef = useRef<CMEditorApi | undefined>(undefined);
  const [renameModal, setRenameModal] = useState<{ open: boolean; defaultName: string } | null>(null);
  const [aiFloatingOpen, setAiFloatingOpen] = useState(false);
  const [aiFloatingPosition, setAiFloatingPosition] = useState({ x: 0, y: 0 });
  const [aiTriggerPosition, setAiTriggerPosition] = useState<{ from: number; to: number } | undefined>(undefined);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedTextPosition, setSelectedTextPosition] = useState<{ from: number; to: number } | undefined>(undefined);

  // Initialize table toolbar
  const { isInTable, handleTableAction, handleCursorMove } = useTableToolbar(cmRef);

  // Handle text selection for AI
  const handleTextSelection = useCallback(() => {
    const api = cmRef.current;
    if (api) {
      const selection = api.getSelectionOffsets();
      if (selection.from !== selection.to) {
        // There is a selection
        const selected = editContent.slice(selection.from, selection.to);
        setSelectedText(selected);
        setSelectedTextPosition(selection);
      } else {
        // No selection
        setSelectedText('');
        setSelectedTextPosition(undefined);
      }
    }
  }, [editContent]);

  // Handle AI text insertion
  const handleAITextInsert = useCallback((text: string, replacePosition?: { from: number; to: number }) => {
    const api = cmRef.current;
    if (api) {
      if (replacePosition) {
        // Replace text at specific position
        api.setSelection(replacePosition.from, replacePosition.to);
        api.insertTextAtSelection(text);
      } else {
        // Insert at current selection
        api.insertTextAtSelection(text);
      }
    } else {
      if (replacePosition) {
        // Replace text in the content string
        const before = editContent.slice(0, replacePosition.from);
        const after = editContent.slice(replacePosition.to);
        setEditContent(before + text + after);
      } else {
        // Fallback for non-CMEditor case
        setEditContent(editContent + text);
      }
    }
  }, [editContent, setEditContent]);



 

  // Initialize paste image functionality
  const { handlePasteImage, uploadPastedImage } = usePasteImage({
    notes,
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
          onAITrigger={(pos, triggerPosition) => {
            // Check for text selection first
            handleTextSelection();
            setAiFloatingPosition(pos);
            setAiTriggerPosition(triggerPosition);
            setAiFloatingOpen(true);
          }}
        />
      </div>
      
      {/* AI Floating Input */}
      <AIFloatingInput
        isVisible={aiFloatingOpen}
        position={aiFloatingPosition}
        onClose={() => setAiFloatingOpen(false)}
        onInsertText={handleAITextInsert}
        noteContent={editContent}
        aiTriggerPosition={aiTriggerPosition}
        selectedText={selectedText}
        selectedTextPosition={selectedTextPosition}
        onSelectionChange={handleTextSelection}
        onRestoreCursor={() => {
          // Focus the editor and restore cursor position
          if (cmRef.current) {
            cmRef.current.focus();
          }
        }}
      />
    </div>
  );
};
