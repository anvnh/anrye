import { useState, useCallback, useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import type { CMEditorApi } from '../../components/editor/core/CMEditor';
import { tableOperations } from '../../utils/table-render/tableOperations';

export const useTableToolbar = (cmApiRef?: React.RefObject<CMEditorApi | undefined>) => {
  const [isInTable, setIsInTable] = useState(false);
  
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isCursorInTable = useCallback(() => {
    const api = cmApiRef?.current;
    if (!api) return false;

    try {
      const currentLine = api.getSelectionLine();
      const totalLines = api.getDocLineCount();
      if (currentLine < 0 || currentLine >= totalLines) return false;

      const getLine = (ln: number) => api.getLineText(ln) || '';
      const lineText = getLine(currentLine);

  // Fast fail: must contain at least one pipe
  if ((lineText.match(/\|/g) || []).length < 1) return false;

      // Walk upwards to find start of contiguous table block
      let start = currentLine;
      while (start > 0 && (getLine(start - 1).match(/\|/g) || []).length >= 2) {
        start--;
      }
      // Walk downwards to find end of block
      let end = currentLine;
      while (end + 1 < totalLines && (getLine(end + 1).match(/\|/g) || []).length >= 2) {
        end++;
      }

      // A valid markdown table needs at least header + separator (>= 2 lines)
      if (end - start + 1 < 2) return false;

      // Validate the separator line (usually second line in the block)
      const separator = getLine(start + 1);
  // Accept 1 or more columns; leading/trailing pipes optional
  const isSeparator = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(separator);
      if (!isSeparator) return false;

      return true;
    } catch {
      return false;
    }
  }, [cmApiRef]);

  const getCursorPosition = useCallback(() => {
    const api = cmApiRef?.current;
    if (!api) return { x: 0, y: 0 };

    try {
      const contentDOM = api.contentDOM;
      if (!contentDOM) return { x: 0, y: 0 };

      // Get cursor position relative to the editor
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return { x: 0, y: 0 };

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Get editor position
      const editorRect = contentDOM.getBoundingClientRect();
      
      // Calculate position relative to the editor container
      const x = rect.left - editorRect.left + rect.width / 2;
      const y = Math.max(10, rect.top - editorRect.top - 50); // Position above cursor with minimum top margin
      
      return { x, y };
    } catch {
      return { x: 0, y: 0 };
    }
  }, [cmApiRef]);

  const handleTableAction = useCallback((action: string, direction?: string) => {
    const api = cmApiRef?.current;
    if (!api) return;



    switch (action) {
      case 'insertColumn':
        if (direction === 'left' || direction === 'right') {
          tableOperations.insertColumn(api, direction);
        }
        break;
      case 'deleteColumn':
        tableOperations.deleteColumn(api);
        break;
      case 'moveColumn':
        if (direction === 'left' || direction === 'right') {
          tableOperations.moveColumn(api, direction);
        }
        break;
      case 'align':
        if (direction === 'left' || direction === 'center' || direction === 'right' || direction === 'none') {
          tableOperations.alignColumn(api, direction);
        }
        break;
      case 'insertRow':
        if (direction === 'above' || direction === 'below') {
          tableOperations.insertRow(api, direction);
        }
        break;
      case 'deleteRow':
        tableOperations.deleteRow(api);
        break;
    }
  }, [cmApiRef]);

  const handleCursorMove = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a small delay to avoid flickering
    timeoutRef.current = setTimeout(() => {
      const inTable = isCursorInTable();
      setIsInTable(inTable);
    }, 100);
  }, [isCursorInTable]);

  // Listen for cursor movements
  useEffect(() => {
    const api = cmApiRef?.current;
    if (!api) return;

    const contentDOM = api.contentDOM;
    if (!contentDOM) return;



    // Listen for mouse events
    const handleMouseMove = () => {
      handleCursorMove();
    };

    const handleKeyDown = () => {
      handleCursorMove();
    };

    const handleClick = () => {
      handleCursorMove();
    };

    const handleSelectionChange = () => {
      handleCursorMove();
    };

    contentDOM.addEventListener('mousemove', handleMouseMove);
    contentDOM.addEventListener('keydown', handleKeyDown);
    contentDOM.addEventListener('click', handleClick);
    contentDOM.addEventListener('selectionchange', handleSelectionChange);

    // Also listen for CodeMirror's selection changes
    const cmView = (api as any).view;
    if (cmView) {
      const updateListener = cmView.state.field(EditorView.updateListener);
      if (updateListener) {
        const originalListener = updateListener;
        cmView.state.field(EditorView.updateListener, (update: any) => {
          originalListener(update);
          if (update.selectionSet) {
            handleCursorMove();
          }
        });
      }
    }

    return () => {
      contentDOM.removeEventListener('mousemove', handleMouseMove);
      contentDOM.removeEventListener('keydown', handleKeyDown);
      contentDOM.removeEventListener('click', handleClick);
      contentDOM.removeEventListener('selectionchange', handleSelectionChange);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [cmApiRef, handleCursorMove]);

  return {
    isInTable,
    handleTableAction,
    handleCursorMove
  };
};
