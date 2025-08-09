'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Note, Folder } from './types';
import { MemoizedMarkdown, OptimizedMarkdownBlocksAST } from '../_utils';
import { EditorToolbar } from './EditorToolbar';
import { useAdvancedDebounce } from '@/app/lib/hooks/useDebounce';
import { performanceMonitor, batchDOMUpdates } from '@/app/lib/optimizations';
import { usePasteImage } from '../_hooks/usePasteImage';
import { useWikilinkAutocomplete } from '../_hooks/useWikilinkAutocomplete';
import RenameImageDialog from './RenameImageDialog';
import WikilinkAutocomplete from './WikilinkAutocomplete';


interface NoteSplitEditorProps {
  editContent: string;
  setEditContent: (content: string) => void;
  notes: Note[];
  folders: Folder[];
  selectedNote: Note | null;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  isSignedIn: boolean;
  driveService: {
    updateFile: (fileId: string, content: string) => Promise<void>;
  };
  tabSize?: number;
  fontSize?: string;
  previewFontSize?: string;
  setIsLoading: (loading: boolean) => void;
  setSyncProgress: (progress: number) => void;
}

export const NoteSplitEditor: React.FC<NoteSplitEditorProps> = ({
  editContent,
  setEditContent,
  notes,
  folders,
  selectedNote,
  setNotes,
  setSelectedNote,
  isSignedIn,
  driveService,
  tabSize = 2,
  fontSize = '16px',
  previewFontSize = '16px',
  setIsLoading,
  setSyncProgress
}) => {
  
  // Refs for scroll sync targets
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const domHeadingElsRef = useRef<HTMLElement[]>([]);

  // Handle wikilink navigation
  const handleNavigateToNote = (noteId: string) => {
    const targetNote = notes.find(note => note.id === noteId);
    if (targetNote) {
      setSelectedNote(targetNote);
    }
  };

  // Wikilink autocomplete
  const { autocompleteState, insertSuggestion, closeAutocomplete } = useWikilinkAutocomplete({
    notes,
    textareaRef: textareaRef as React.RefObject<HTMLTextAreaElement>,
    editContent,
    setEditContent
  });
  const [renameModal, setRenameModal] = useState<{ open: boolean; defaultName: string } | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

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
        (window as any).__rename_image_cb_split__ = handle;
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

  // Split pane resize state
  const [leftPaneWidth, setLeftPaneWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Enhanced debounced content for markdown rendering with adaptive delay
  const [debouncedContent, cancelDebounce, isPending] = useAdvancedDebounce(editContent, {
    delay: 300,
    maxWait: 1000,
    leading: false,
    trailing: true
  });

  const pendingUpdateRef = useRef<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Internal sync flags
  const isSyncingRef = useRef<boolean>(false);
  const lastSourceRef = useRef<'raw' | 'preview' | null>(null);
  const rafRef = useRef<number | null>(null);
  const SCROLL_THRESHOLD = 3; // pixels
  const THROTTLE_DELAY = 8; // ~120fps
  const HYSTERESIS_PX = 6;
  const SNAP_PX = 12;
  const CARET_PRIORITY_WINDOW_MS = 400;

  // Caret tracking
  const caretLineRef = useRef<number>(0);
  const lastCaretChangeRef = useRef<number>(0);

  const updateCaretInfo = useCallback((textarea: HTMLTextAreaElement) => {
    try {
      const pos = textarea.selectionStart ?? 0;
      const before = textarea.value.slice(0, pos);
      const line = before.split('\n').length - 1;
      caretLineRef.current = line;
      lastCaretChangeRef.current = Date.now();
    } catch {}
  }, []);

  // Remove the old debounce effect since we're using the advanced hook
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setDebouncedContent(editContent);
  //   }, 500);
  //   return () => clearTimeout(timer);
  // }, [editContent]);

  // Handle resizing between panes
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeRef.current) return;

    const container = resizeRef.current.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Constrain between 20% and 80%
    const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
    setLeftPaneWidth(constrainedWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Handle double-click to reset to 50-50 split
  const handleDoubleClick = useCallback(() => {
    setLeftPaneWidth(50);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const lastScrollPositions = useRef<{ raw: number; preview: number }>({ raw: 0, preview: 0 });

  // ---------- Heading-based mapping helpers ----------
  const preprocessContent = useCallback((content: string) => {
    let processed = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, p1) => `\n$$${p1}$$\n`);
    processed = processed.replace(/\n{3,}/g, '\n\n');
    return processed;
  }, []);

  const stripMarkdown = useCallback((text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/^#+\s+/, '')
      .trim();
  }, []);

  type HeadingInfo = { line: number; level: number; id: string };

  const headingList = useMemo<HeadingInfo[]>(() => {
    const processed = preprocessContent(editContent);
    const lines = processed.split('\n');
    const titleCounts: Record<string, number> = {};
    const result: HeadingInfo[] = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        const cleanTitle = stripMarkdown(rawTitle);
        const baseId = cleanTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();
        titleCounts[baseId] = (titleCounts[baseId] || 0) + 1;
        const id = titleCounts[baseId] === 1 ? baseId : `${baseId}-${titleCounts[baseId]}`;
        result.push({ line: index, level, id });
      }
    });
    return result;
  }, [editContent, preprocessContent, stripMarkdown]);

  const findHeadingForApproxLine = useCallback((approxLine: number): { heading: HeadingInfo; index: number } | null => {
    if (headingList.length === 0) return null;
    let chosenIndex = 0;
    for (let i = 0; i < headingList.length; i++) {
      if (headingList[i].line <= approxLine) {
        chosenIndex = i;
      } else {
        break;
      }
    }
    return { heading: headingList[chosenIndex], index: chosenIndex };
  }, [headingList]);

  // ---------- Precise heading-based alignment (anchor interpolation) ----------
  function getOffsetTopWithinContainer(el: HTMLElement, container: HTMLElement): number {
    let offset = 0;
    let current: HTMLElement | null = el;
    while (current && current !== container) {
      offset += current.offsetTop;
      current = current.offsetParent as HTMLElement | null;
    }
    return offset;
  }

  function computeAnchors(rawElement: HTMLTextAreaElement) {
    const container = previewRef.current;
    if (!container) return null;

    // Prefer block-level anchors for precision
    const blockNodes = Array.from(container.querySelectorAll('[data-block-index]')) as HTMLElement[];
    const totalLines = Math.max(1, editContent.split('\n').length);
    const pixelsPerLine = (rawElement.scrollHeight - rawElement.clientTop) / totalLines;

    let rawAnchorsCore: number[] = [];
    let previewAnchorsCore: number[] = [];

    if (blockNodes.length > 0) {
      rawAnchorsCore = blockNodes.map(node => {
        const startLineAttr = node.getAttribute('data-start-line');
        const startLine = startLineAttr ? parseInt(startLineAttr, 10) : 0;
        return startLine * pixelsPerLine;
      });
      previewAnchorsCore = blockNodes.map(node => getOffsetTopWithinContainer(node, container));
    } else {
      // Fallback to heading-based anchors
      rawAnchorsCore = headingList.map(h => h.line * pixelsPerLine);
      const domHeadings = domHeadingElsRef.current;
      previewAnchorsCore = domHeadings.map(h => getOffsetTopWithinContainer(h, container));
    }

    // Align lengths
    const minLen = Math.min(rawAnchorsCore.length, previewAnchorsCore.length);
    const rawAnchors: number[] = [];
    const previewAnchors: number[] = [];

    // Add top anchor
    rawAnchors.push(0);
    previewAnchors.push(0);

    for (let i = 0; i < minLen; i++) {
      rawAnchors.push(rawAnchorsCore[i]);
      previewAnchors.push(previewAnchorsCore[i]);
    }

    // Add bottom anchor
    const rawEnd = (totalLines - 1) * pixelsPerLine;
    const previewEnd = Math.max(0, container.scrollHeight - container.clientHeight);
    rawAnchors.push(rawEnd);
    previewAnchors.push(previewEnd);

    return { rawAnchors, previewAnchors };
  }

  const scrollPreviewToElement = useCallback((el: HTMLElement) => {
    const container = previewRef.current;
    if (!container || !el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const targetTop = container.scrollTop + (elRect.top - containerRect.top);
    container.scrollTo({ top: targetTop, behavior: 'auto' });
  }, []);

  const scrollPreviewToHeadingId = useCallback((headingId: string) => {
    const container = previewRef.current;
    if (!container) return;
    const safeEscape = (value: string) => {
      try {
        // @ts-ignore - CSS may not be typed in some environments
        return (CSS && typeof CSS.escape === 'function') ? CSS.escape(value) : value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
      } catch {
        return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
      }
    };
    const el = container.querySelector(`#${safeEscape(headingId)}`) as HTMLElement | null;
    if (!el) return;
    scrollPreviewToElement(el);
  }, [scrollPreviewToElement]);

  // ---------- Scroll handlers using heading alignment ----------
  const syncPreviewFromRaw = useCallback((rawElement: HTMLTextAreaElement) => {
    if (!rawElement) return;
    if (isSyncingRef.current && lastSourceRef.current !== 'raw') return;

    const maxScroll = rawElement.scrollHeight - rawElement.clientHeight;
    if (maxScroll <= 0) return;
    const currentScrollTop = rawElement.scrollTop;
    if (Math.abs(currentScrollTop - lastScrollPositions.current.raw) < SCROLL_THRESHOLD) return;

    lastScrollPositions.current.raw = currentScrollTop;

    const totalLines = Math.max(1, editContent.split('\n').length);
    const ratio = Math.max(0, Math.min(1, currentScrollTop / maxScroll));
    const approxLine = Math.max(0, Math.min(totalLines - 1, Math.round(ratio * (totalLines - 1))));
    const found = findHeadingForApproxLine(approxLine);

    isSyncingRef.current = true;
    lastSourceRef.current = 'raw';
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const container = previewRef.current;
      // Primary: precise heading-based interpolation (HackMD-like)
      const anchors = computeAnchors(rawElement);
      if (container && anchors && anchors.rawAnchors.length >= 2) {
        const { rawAnchors, previewAnchors } = anchors;
        // Caret-priority: if caret moved recently, align to caret line position
        const useCaret = Date.now() - lastCaretChangeRef.current < CARET_PRIORITY_WINDOW_MS;
        const pixelsPerLine = (rawElement.scrollHeight - rawElement.clientTop) / totalLines;
        const x = useCaret ? caretLineRef.current * pixelsPerLine : currentScrollTop;
        // Find segment
        let i = 0;
        for (let j = 1; j < rawAnchors.length; j++) {
          if (x < rawAnchors[j]) { i = j - 1; break; }
          i = j - 1;
        }
        const x0 = rawAnchors[i];
        const x1 = rawAnchors[i + 1] ?? x0 + 1;
        const y0 = previewAnchors[i];
        const y1 = previewAnchors[i + 1] ?? y0;
        const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
        let target = Math.max(0, Math.min(Math.round(y0 + t * (y1 - y0)), container.scrollHeight - container.clientHeight));
        // Snap to nearest anchor to reduce jitter
        if (Math.abs(target - y0) < SNAP_PX) target = y0;
        else if (Math.abs(target - y1) < SNAP_PX) target = y1;
        // Hysteresis: skip tiny movements
        if (Math.abs(container.scrollTop - target) > HYSTERESIS_PX) {
          container.scrollTo({ top: target, behavior: 'auto' });
        }
        setTimeout(() => {
          isSyncingRef.current = false;
          lastSourceRef.current = null;
        }, 16);
        return;
      }

      const domHeadings = domHeadingElsRef.current;
      if (domHeadings && domHeadings.length > 0) {
        if (found) {
          const idx = Math.max(0, Math.min(domHeadings.length - 1, found.index));
          scrollPreviewToElement(domHeadings[idx]);
        } else {
          // No headings parsed from source; map by ratio to DOM headings
          const idx = Math.max(0, Math.min(domHeadings.length - 1, Math.round(ratio * (domHeadings.length - 1))));
          scrollPreviewToElement(domHeadings[idx]);
        }
      } else if (found) {
        // Fallback to ID-based if DOM heading list is empty
        scrollPreviewToHeadingId(found.heading.id);
      } else {
        // Final fallback: ratio-based scroll
        const container2 = previewRef.current;
        if (container2) {
          const maxTarget2 = container2.scrollHeight - container2.clientHeight;
          const t2 = Math.round(ratio * maxTarget2);
          if (maxTarget2 > 0 && Math.abs(container2.scrollTop - t2) > HYSTERESIS_PX) container2.scrollTo({ top: t2, behavior: 'auto' });
        }
      }
      // Release soon to allow opposite side after the scroll settles
      setTimeout(() => {
        isSyncingRef.current = false;
        lastSourceRef.current = null;
      }, 16);
    });
  }, [editContent, findHeadingForApproxLine, scrollPreviewToElement, scrollPreviewToHeadingId, computeAnchors]);

  const handleRawScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    if (now - (lastScrollPositions.current as any).lastRawScrollTime < THROTTLE_DELAY) return;
    (lastScrollPositions.current as any).lastRawScrollTime = now;
    syncPreviewFromRaw(e.currentTarget);
  }, [syncPreviewFromRaw]);

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Reverse sync: map preview scroll to raw textarea using same anchors
    const now = Date.now();
    if (now - (lastScrollPositions.current as any).lastPreviewScrollTime < THROTTLE_DELAY) return;
    (lastScrollPositions.current as any).lastPreviewScrollTime = now;

    const container = previewRef.current;
    const textarea = textareaRef.current;
    if (!container || !textarea) return;
    if (isSyncingRef.current && lastSourceRef.current !== 'preview') return;

    const anchors = computeAnchors(textarea);
    if (!anchors || anchors.rawAnchors.length < 2) return;

    const { rawAnchors, previewAnchors } = anchors;
    const y = container.scrollTop;
    let i = 0;
    for (let j = 1; j < previewAnchors.length; j++) {
      if (y < previewAnchors[j]) { i = j - 1; break; }
      i = j - 1;
    }
    const y0 = previewAnchors[i];
    const y1 = previewAnchors[i + 1] ?? y0 + 1;
    const x0 = rawAnchors[i];
    const x1 = rawAnchors[i + 1] ?? x0;
    const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    let target = Math.max(0, Math.min(Math.round(x0 + t * (x1 - x0)), textarea.scrollHeight - textarea.clientHeight));
    // Snap to nearest raw anchor
    if (Math.abs(target - x0) < SNAP_PX) target = x0;
    else if (Math.abs(target - x1) < SNAP_PX) target = x1;

    isSyncingRef.current = true;
    lastSourceRef.current = 'preview';
    if (Math.abs(textarea.scrollTop - target) > HYSTERESIS_PX) {
      textarea.scrollTo({ top: target, behavior: 'auto' });
    }
    setTimeout(() => {
      isSyncingRef.current = false;
      lastSourceRef.current = null;
    }, 16);
  }, [computeAnchors]);

  // Track caret changes from user interactions
  const handleRawSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    updateCaretInfo(e.currentTarget);
  }, [updateCaretInfo]);


  // Handle Tab key, auto bracket/quote, auto bullet, etc.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
          let updatedLines = [...lines];
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
  }, [setEditContent, tabSize]);

  // Debounced renumbering to avoid excessive calls
  const renumberTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to renumber consecutive numbered lists (optimized)
  const renumberNumberedLists = useCallback((content: string, preserveCursor?: { start: number; end: number }): { content: string; cursorAdjustment: number } => {
    const lines = content.split('\n');
    const updatedLines = [...lines];
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

  // Optimized onChange handler with performance monitoring and debounced renumbering
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    performanceMonitor.start('content-change');
    
    const newValue = e.target.value;
    
    // Immediately update content for responsive feel
    setEditContent(newValue);

    // Batch updates to avoid excessive re-renders
    pendingUpdateRef.current = newValue;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      if (pendingUpdateRef.current !== null) {
        pendingUpdateRef.current = null;
      }
      performanceMonitor.end('content-change');
    }, 50);
    
    // Debounced renumbering for performance
    if (renumberTimeoutRef.current) {
      clearTimeout(renumberTimeoutRef.current);
    }
    
    // Only schedule renumbering if content contains numbered lists
    if (/^\s*\d+\.\s/m.test(newValue)) {
      renumberTimeoutRef.current = setTimeout(() => {
        const textarea = textareaRef.current;
        const cursorPos = textarea ? { start: textarea.selectionStart, end: textarea.selectionEnd } : undefined;
        
        const result = renumberNumberedLists(newValue, cursorPos);
        
        // Only update if content actually changed
        if (result.content !== newValue) {
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
  }, [setEditContent, renumberNumberedLists]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (renumberTimeoutRef.current) {
        clearTimeout(renumberTimeoutRef.current);
      }
    };
  }, []);

  // Optimized real-time preview with enhanced debounced content and performance monitoring
  const realtimePreview = useMemo(() => {
    performanceMonitor.start('preview-render');
    
    const preview = (
      <div className="relative">
        {isPending && (
          <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Updating...
          </div>
        )}
        <OptimizedMarkdownBlocksAST
          content={debouncedContent}
          notes={notes}
          selectedNote={selectedNote}
          setEditContent={setEditContent}
          setNotes={setNotes}
          setSelectedNote={setSelectedNote}
          isSignedIn={isSignedIn}
          driveService={driveService}
          onNavigateToNote={handleNavigateToNote}
        />
      </div>
    );
    
    // Use RAF for non-blocking rendering
    batchDOMUpdates(() => {
      performanceMonitor.end('preview-render');
    });
    
    return preview;
  }, [debouncedContent, isPending, notes, selectedNote, setEditContent, setNotes, setSelectedNote, isSignedIn, driveService]);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Rebuild DOM heading list whenever preview content updates
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    const nodeList = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    domHeadingElsRef.current = Array.from(nodeList) as HTMLElement[];
  }, [debouncedContent]);

  // Helper to rebuild DOM heading list (and keep it fresh while preview updates)
  const rebuildDomHeadingList = useCallback(() => {
    const container = previewRef.current;
    if (!container) return;
    const nodeList = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    domHeadingElsRef.current = Array.from(nodeList) as HTMLElement[];
  }, []);

  // Keep heading list updated reactively using a MutationObserver
  useEffect(() => {
    // Initial build shortly after mount/content change
    const rafId = requestAnimationFrame(() => {
      rebuildDomHeadingList();
    });

    const container = previewRef.current;
    if (!container) return () => cancelAnimationFrame(rafId);

    // Disconnect any previous observer
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
      mutationObserverRef.current = null;
    }

    const observer = new MutationObserver(() => {
      // Rebuild when children or attributes change (e.g., fold state, lazy content)
      rebuildDomHeadingList();
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true });
    mutationObserverRef.current = observer;

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      if (mutationObserverRef.current === observer) {
        mutationObserverRef.current = null;
      }
    };
  }, [rebuildDomHeadingList, debouncedContent]);

  // Resize-aware anchor maintenance for preview container
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    // @ts-ignore ResizeObserver may not be globally typed
    const RO = (window as any).ResizeObserver || ResizeObserver;
    if (!RO) return;
    const ro = new RO(() => {
      // Rebuild headings and allow anchors to update
      rebuildDomHeadingList();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [rebuildDomHeadingList]);

  // (moved helpers above to avoid TDZ)

  return (
    <div className="flex h-full w-full relative">
      {renameModal?.open && (
        <RenameImageDialog
          isOpen={renameModal.open}
          defaultName={renameModal.defaultName}
          onConfirm={(newName) => {
            const cb = (window as any).__rename_image_cb_split__ as (n: string | null) => void;
            if (cb) cb(newName);
          }}
          onOpenChange={(open) => {
            if (!open) {
              const cb = (window as any).__rename_image_cb_split__ as (n: string | null) => void;
              if (cb) cb(null);
            }
          }}
        />
      )}
      {/* Raw Editor Side */}
      <div
        className="flex flex-col border-r border-gray-500"
        style={{
          backgroundColor: '#31363F',
          width: `${leftPaneWidth}%`
        }}
      >
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
        <div className="flex-1 px-4 py-4 overflow-hidden relative">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={handleContentChange}
            onScroll={handleRawScroll}
            onSelect={handleRawSelect}
            onKeyDown={handleKeyDown}
            className="raw-content w-full h-full resize-none bg-transparent text-gray-200 focus:outline-none font-mono text-sm leading-relaxed"
            placeholder="Write your note in Markdown... (Paste images with Ctrl+V)"
            style={{
              scrollBehavior: 'auto',
              backgroundColor: '#31363F',
              fontSize: fontSize,
              // Performance optimizations
              willChange: 'scroll-position',
              containIntrinsicSize: '1px 1000px'
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
          
          {/* Wikilink Autocomplete */}
          <WikilinkAutocomplete
            isOpen={autocompleteState.isOpen}
            suggestions={autocompleteState.suggestions}
            selectedIndex={autocompleteState.selectedIndex}
            position={autocompleteState.position}
            query={autocompleteState.query}
            onSelect={insertSuggestion}
            onClose={closeAutocomplete}
          />
        </div>
      </div>

      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="w-1 cursor-col-resize flex-shrink-0 relative group"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          backgroundColor: isResizing ? '#6b7595' : '#6b7280'
        }}
        title="Double-click to reset to 50-50 split"
      >
        {/* Resize handle visual indicator */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-full h-full bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Preview Side */}
      <div
        className="flex flex-col"
        style={{
          backgroundColor: '#222831',
          width: `${100 - leftPaneWidth}%`
        }}
      >
        <div
          ref={previewRef}
          className="preview-content flex-1 px-4 py-4 overflow-y-auto"
          onScroll={handlePreviewScroll}
          style={{
            scrollBehavior: 'auto',
            // Performance optimizations
            willChange: 'scroll-position',
            contain: 'layout style paint',
            backgroundColor: '#222831'
          }}
        >
          <div className="prose prose-invert max-w-none w-full" style={{ fontSize: previewFontSize }}>
            <style jsx>{`
              /* Enhanced KaTeX mobile responsiveness */
              .katex { 
                color: #e5e7eb !important;
                font-size: 1.1em !important;
                max-width: 100% !important;
                word-wrap: break-word !important;
              }
              
              .katex-display {
                margin: 1.5em 0 !important;
                text-align: center !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                max-width: 100% !important;
                padding: 0.5rem 0 !important;
                -webkit-overflow-scrolling: touch !important;
              }
              
              .katex-display > .katex {
                display: inline-block !important;
                white-space: nowrap !important;
                min-width: max-content !important;
                max-width: none !important;
              }
              
              /* Mobile-specific KaTeX adjustments */
              @media (max-width: 480px) {
                .katex {
                  font-size: 0.9em !important;
                }
                .katex-display {
                  margin: 1em 0 !important;
                  padding: 0.25rem 0 !important;
                }
                .katex-display > .katex {
                  font-size: 0.85em !important;
                }
              }
              
              @media (max-width: 360px) {
                .katex {
                  font-size: 0.8em !important;
                }
                .katex-display > .katex {
                  font-size: 0.75em !important;
                }
              }
              
              .math-display {
                overflow-x: auto;
                padding: 0.5rem 0;
                text-align: center;
                max-width: 100%;
                -webkit-overflow-scrolling: touch;
              }
              
              .math-inline {
                display: inline;
                word-wrap: break-word;
                max-width: 100%;
              }
              /* Dark theme adjustments for KaTeX */
              .katex .accent {
                color: #e5e7eb !important;
              }
              .katex .mord {
                color: #e5e7eb !important;
              }
              /* Scroll optimization */
              .preview-content {
                scroll-behavior: auto !important;
                background-color: #222831 !important;
              }
              .raw-content {
                scroll-behavior: auto !important;
                background-color: #31363F !important;
              }
              /* Force equal width split */
              .prose {
                width: 100% !important;
                max-width: none !important;
              }
              .katex .mbin, .katex .mrel {
                color: #6b7595 !important;
              }
              .katex .mopen, .katex .mclose {
                color: #fbbf24 !important;
              }
              .katex .mfrac > span {
                border-color: #6b7595 !important;
              }
              .katex .sqrt > .sqrt-line {
                border-top-color: #6b7595 !important;
              }
              /* Enhanced dark theme matching website colors */
              .prose-invert h1, .prose-invert h2, .prose-invert h3, .prose-invert h4, .prose-invert h5, .prose-invert h6 {
                color: #EEEEEE !important;
              }
              .prose-invert p {
                color: #EEEEEE !important;
              }
              .prose-invert strong {
                color: #EEEEEE !important;
              }
              .prose-invert blockquote {
                border-left-color: #6b7595 !important;
                color: #EEEEEE !important;
                background-color: #31363F !important;
                padding: 0.75rem 1rem !important;
                border-radius: 0.375rem !important;
              }
              .prose-invert code {
                color: #fbbf24 !important;
                background-color: #31363F !important;
                padding: 0.125rem 0.25rem !important;
                border-radius: 0.25rem !important;
              }
              .prose-invert pre {
                background-color: #31363F !important;
                border: 1px solid #6b7595 !important;
              }
              .prose-invert a {
                color: #6b7595 !important;
              }
              .prose-invert a:hover {
                color: #8b92b3 !important;
              }
              .prose-invert ul li::marker,
              .prose-invert ol li::marker {
                color: #6b7595 !important;
              }
              .prose-invert table {
                border-color: #6b7595 !important;
              }
              .prose-invert thead th {
                background-color: #31363F !important;
                border-bottom-color: #6b7595 !important;
                color: #EEEEEE !important;
              }
              .prose-invert tbody td {
                border-bottom-color: #6b7595 !important;
                color: #EEEEEE !important;
              }
            `}</style>
            {realtimePreview}
          </div>
        </div>
      </div>
    </div>
  );
};
