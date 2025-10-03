"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { EditorToolbar } from "../toolbar/EditorToolbar";
import { usePasteImage, useTableToolbar } from "../../../hooks";
import { Note } from "../../types";
import CMEditor, { CMEditorApi } from "./CMEditor";
import { AIFloatingInput } from "../../ai/AIFloatingInput";
import WikilinkAutocomplete from "../features/WikilinkAutocomplete";
import { suggestNoteLinks } from "../../../utils/navigation/backlinkUtils";
import { useCMWikilinkPopup } from "../../../hooks/features/useCMWikilinkPopup";
import { useAIFloating } from "../../../hooks/features/useAIFloating";
import { useRenameImageModal } from "../../../hooks/features/useRenameImageModal";
import RenameImageDialog from "../../images/editing/RenameImageDialog";

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
  fontSize = "16px",
  codeBlockFontSize = "14px",
  notes,
  selectedNote,
  setIsLoading,
  setSyncProgress,
}) => {
  const cmRef = useRef<CMEditorApi | undefined>(undefined);
  const {
    aiFloatingOpen,
    setAiFloatingOpen,
    aiFloatingPosition,
    setAiFloatingPosition,
    aiTriggerPosition,
    setAiTriggerPosition,
    selectedText,
    selectedTextPosition,
    handleTextSelection,
    handleAITextInsert,
    onAITrigger,
    onRestoreCursor,
  } = useAIFloating(cmRef, editContent, setEditContent);
  const {
    containerRef,
    wikilinkCtx,
    relativePopupPos,
    onWikilinkContextChange,
    handleWikilinkSelect,
    closeWikilinkPopup,
    selectedIndex,
    setSelectedIndex,
  } = useCMWikilinkPopup({
    editContent,
    setEditContent,
    cmRef,
  });

  // Initialize table toolbar
  const { isInTable, handleTableAction, handleCursorMove } =
    useTableToolbar(cmRef);

  // AI state and handlers provided by useAIFloating

  // Initialize paste image functionality
  const { dialogProps, openRenameModal } = useRenameImageModal("__rename_image_cb__");

  const { handlePasteImage, uploadPastedImage } = usePasteImage({
    notes,
    selectedNote,
    setEditContent,
    setIsLoading,
    setSyncProgress,
    onBeforeUpload: async (defaultFilename) => openRenameModal(defaultFilename),
    getTargetTextarea: () => null,
  });
  // CMEditor handles paste internally via onPasteImage

  // Debounced renumbering to avoid excessive calls
  const renumberTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Wikilink suggestions memoized
  const wikilinkSuggestions = useMemo(
    () => suggestNoteLinks(wikilinkCtx.query, notes, 8),
    [wikilinkCtx.query, notes]
  );

  // Keep selectedIndex within bounds when list changes
  useEffect(() => {
    if (!wikilinkCtx.open) return;
    if (wikilinkSuggestions.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex < 0 || selectedIndex >= wikilinkSuggestions.length) {
      setSelectedIndex(0);
    }
  }, [wikilinkCtx.open, wikilinkSuggestions.length, selectedIndex, setSelectedIndex]);

  // Function to renumber consecutive numbered lists (optimized)
  const renumberNumberedLists = useCallback(
    (
      content: string,
      preserveCursor?: { start: number; end: number }
    ): { content: string; cursorAdjustment: number } => {
      const lines = content.split("\n");
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
            } else if (currentLine.trim() === "") {
              continue;
            } else if (
              currentMatch &&
              currentMatch[1].length > baseIndentation.length
            ) {
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
                const restOfLine = currentLine.substring(
                  currentMatch[0].length
                );
                const newLine =
                  baseIndentation + newNumberStr + ". " + restOfLine;

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
        content: updatedLines.join("\n"),
        cursorAdjustment: cursorLineAdjustment,
      };
    },
    []
  );

  // Optimized content change handler with debouncing
  const handleContentChange = useCallback(
    (newContent: string) => {
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
    },
    [renumberNumberedLists]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (renumberTimeoutRef.current) {
        clearTimeout(renumberTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 bg-secondary" ref={containerRef}>
      {dialogProps.isOpen && (
        <RenameImageDialog
          isOpen={dialogProps.isOpen}
          defaultName={dialogProps.defaultName}
          onConfirm={dialogProps.onConfirm}
          onOpenChange={dialogProps.onOpenChange}
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
          onAITrigger={(pos, triggerPosition) => onAITrigger(pos, triggerPosition)}
          onWikilinkContextChange={onWikilinkContextChange}
          wikilinkNavigation={{
            isOpen: () => !!wikilinkCtx.open,
            moveDown: () => {
              const total = wikilinkSuggestions.length;
              if (total === 0) return;
              setSelectedIndex((prev) => (prev + 1) % total);
            },
            moveUp: () => {
              const total = wikilinkSuggestions.length;
              if (total === 0) return;
              setSelectedIndex((prev) => (prev - 1 + total) % total);
            },
            confirm: () => {
              const item = wikilinkSuggestions[selectedIndex];
              if (item) handleWikilinkSelect(item);
            },
            close: () => closeWikilinkPopup(),
          }}
        />
      </div>
      
      {/* Wikilink Autocomplete Popup */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 40 }}>
        <div className="relative w-full h-full pointer-events-none">
              <WikilinkAutocomplete
                isOpen={wikilinkCtx.open}
                suggestions={wikilinkSuggestions}
                selectedIndex={selectedIndex}
                position={relativePopupPos}
                onSelect={(note) => {
                  handleWikilinkSelect(note);
                }}
                onClose={() => closeWikilinkPopup()}
                query={wikilinkCtx.query}
                positionMode={"absolute"}
                onHoverIndexChange={(i) => setSelectedIndex(i)}
              />
        </div>
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
        onRestoreCursor={onRestoreCursor}
      />
    </div>
  );
};
