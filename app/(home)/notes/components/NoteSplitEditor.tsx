'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Note } from './types';
import { MemoizedMarkdown, OptimizedMarkdownBlocksAST } from '../utils';
import { EditorToolbar } from './EditorToolbar';
import { useAdvancedDebounce } from '@/app/lib/hooks/useDebounce';
import { performanceMonitor, batchDOMUpdates } from '@/app/lib/optimizations';
import { usePasteImage, useTableToolbar } from '../hooks';
import RenameImageDialog from './RenameImageDialog';
import CMEditor, { CMEditorApi } from './CMEditor';
import { AIFloatingInput } from './AIFloatingInput';


interface NoteSplitEditorProps {
  editContent: string;
  setEditContent: (content: string) => void;
  notes: Note[];
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
  codeBlockFontSize?: string;
  setIsLoading: (loading: boolean) => void;
  setSyncProgress: (progress: number) => void;
  notesTheme?: 'light' | 'dark';
}

export const NoteSplitEditor: React.FC<NoteSplitEditorProps> = (
  {
    editContent,
    setEditContent,
    notes,
    selectedNote,
    setNotes,
    setSelectedNote,
    isSignedIn,
    driveService,
    tabSize = 2,
    fontSize = '16px',
    previewFontSize = '16px',
    codeBlockFontSize = '14px',
    setIsLoading,
    setSyncProgress,
    notesTheme = 'dark'
  }
) => {

  // Refs for scroll sync targets
  const cmRef = useRef<CMEditorApi | undefined>(undefined);
  const previewRef = useRef<HTMLDivElement>(null);
  const domHeadingElsRef = useRef<HTMLElement[]>([]);
  const [editorReady, setEditorReady] = useState(false);

  // Handle wikilink navigation
  const handleNavigateToNote = (noteId: string) => {
    const targetNote = notes.find(note => note.id === noteId);
    if (targetNote) {
      setSelectedNote(targetNote);
    }
  };

  // --- Sticky-bottom guard to avoid jitter when leaving bottom ---
  const stickyBottomRef = useRef(false);
  const BOTTOM_EPS = 1;         // px tolerance to consider "at bottom"
  const LEAVE_BOTTOM_DELTA = 8; // px the editor/preview must move up to "unlock"

  // Actively scrolled side to prevent feedback loops
  const scrollOwnerRef = useRef<'raw' | 'preview' | null>(null);
  const scrollOwnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setScrollOwner = useCallback((owner: 'raw' | 'preview') => {
    scrollOwnerRef.current = owner;
    if (scrollOwnerTimerRef.current) clearTimeout(scrollOwnerTimerRef.current);
    // Keep ownership for a short window after interaction
    scrollOwnerTimerRef.current = setTimeout(() => {
      scrollOwnerRef.current = null;
    }, 350);
  }, []);


  const scrollEditorToStartLine = useCallback((startLineZeroBased: number) => {
    const api = cmRef.current;
    if (!api) return;
    api.scrollToLine(startLineZeroBased, /*smooth*/ false);
  }, []);

  const [renameModal, setRenameModal] = useState<{ open: boolean; defaultName: string } | null>(null);
  const [aiFloatingOpen, setAiFloatingOpen] = useState(false);
  const [aiFloatingPosition, setAiFloatingPosition] = useState({ x: 0, y: 0 });
  const [aiTriggerPosition, setAiTriggerPosition] = useState<{ from: number; to: number } | undefined>(undefined);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedTextPosition, setSelectedTextPosition] = useState<{ from: number; to: number } | undefined>(undefined);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

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
        (window as any).__rename_image_cb_split__ = handle;
      });
    },
    getTargetTextarea: () => null
  });

  // CMEditor will handle paste via onPasteImage

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
    } catch { }
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
    const fenceRegex = /^\s*(```|~~~)/;
    let inFence = false;
    lines.forEach((line, index) => {
      if (fenceRegex.test(line)) {
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      // Ignore indented code blocks (4+ leading spaces or a tab)
      if (/^(\t| {4,})/.test(line)) return;
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

  function computeAnchors(rawElement: HTMLElement) {
    const container = previewRef.current;
    if (!container) return null;

    // Prefer block-level anchors for precision
    const blockNodes = Array.from(container.querySelectorAll('[data-block-index]')) as HTMLElement[];
    const totalLines = Math.max(1, editContent.split('\n').length);

    // const pixelsPerLine = (rawElement.scrollHeight - rawElement.clientTop) / totalLines;
    const pixelsPerLine = rawElement.scrollHeight / Math.max(1, totalLines);

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

    // Add bottom anchor - use actual scrollable heights
    const rawEnd = rawElement.scrollHeight - rawElement.clientHeight;
    const previewEnd = container.scrollHeight - container.clientHeight;
    rawAnchors.push(rawEnd);
    previewAnchors.push(previewEnd);

    return { rawAnchors, previewAnchors };
  }

  const scrollPreviewTo = (container: HTMLElement, top: number) => {
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTo({ top: Math.min(maxTop, Math.max(0, top)), behavior: 'auto' });
  };

  const scrollPreviewToBottom = (container: HTMLElement) => {
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTo({ top: maxTop, behavior: 'auto' });
  };

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
  const syncPreviewFromRaw = useCallback((rawElement: HTMLElement) => {
    if (!rawElement) return;
    if (isSyncingRef.current && lastSourceRef.current !== 'raw') return;

    const maxScroll = rawElement.scrollHeight - rawElement.clientHeight;
    if (maxScroll <= 0) return;
    const currentScrollTop = rawElement.scrollTop;

    // Treat "near bottom" as bottom to avoid needing extra wheel ticks
    const NEAR_BOTTOM_PX = 24;          // ~1 line height or a bit more
    const NEAR_BOTTOM_RATIO = 0.985;    // 98.5% down is bottom

    // --- Near-bottom detection to avoid extra wheel turns ---
    const nearBottom =
      (maxScroll - currentScrollTop) <= NEAR_BOTTOM_PX ||
      (maxScroll > 0 && (currentScrollTop / maxScroll) >= NEAR_BOTTOM_RATIO);

    if (nearBottom && previewRef.current) {
      isSyncingRef.current = true;
      lastSourceRef.current = 'raw';
      scrollPreviewToBottom(previewRef.current);
      stickyBottomRef.current = true;
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
        lastSourceRef.current = null;
      });
      return;
    }

    if (Math.abs(currentScrollTop - lastScrollPositions.current.raw) < SCROLL_THRESHOLD) return;

    lastScrollPositions.current.raw = currentScrollTop;

    const totalLines = Math.max(1, editContent.split('\n').length);
    const ratio = Math.max(0, Math.min(1, currentScrollTop / maxScroll));
    // Use actual scroll heights for better accuracy
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
          // No headings parsed from source; map by ratio to DOM headings using actual scroll heights
          if (container) {
            const maxSource = rawElement.scrollHeight - rawElement.clientHeight;
            const maxTarget = container.scrollHeight - container.clientHeight;
            if (maxSource > 0 && maxTarget > 0) {
              const targetRatio = currentScrollTop / maxSource;
              const idx = Math.max(0, Math.min(domHeadings.length - 1, Math.round(targetRatio * (domHeadings.length - 1))));
              scrollPreviewToElement(domHeadings[idx]);
            }
          }
        }
      } else if (found) {
        // Fallback to ID-based if DOM heading list is empty
        scrollPreviewToHeadingId(found.heading.id);
      } else {
        // Final fallback: ratio-based scroll using actual scroll heights
        const container2 = previewRef.current;
        if (container2) {
          const maxTarget2 = container2.scrollHeight - container2.clientHeight;
          const maxSource2 = rawElement.scrollHeight - rawElement.clientHeight;
          if (maxTarget2 > 0 && maxSource2 > 0) {
            const t2 = Math.round((currentScrollTop / maxSource2) * maxTarget2);
            if (Math.abs(container2.scrollTop - t2) > HYSTERESIS_PX) {
              container2.scrollTo({ top: t2, behavior: 'auto' });
            }
          }
        }
      }
      // Release soon to allow opposite side after the scroll settles
      setTimeout(() => {
        isSyncingRef.current = false;
        lastSourceRef.current = null;
      }, 16);
    });
  }, [editContent, findHeadingForApproxLine, scrollPreviewToElement, scrollPreviewToHeadingId, computeAnchors]);

  const handleRawScroll = useCallback(() => {
    // Only allow raw->preview sync when user is actively interacting with editor
    if (scrollOwnerRef.current !== 'raw') return;
    const now = Date.now();
    if (now - (lastScrollPositions.current as any).lastRawScrollTime < THROTTLE_DELAY) return;
    (lastScrollPositions.current as any).lastRawScrollTime = now;
    const raw = cmRef.current?.scrollDOM;
    if (!raw) return;
    // Always sync preview when editor scrolls
    syncPreviewFromRaw(raw);
  }, [syncPreviewFromRaw]);

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Only allow preview->raw sync when user is actively interacting with preview
    if (scrollOwnerRef.current !== 'preview') return;
    // Reverse sync: map preview scroll to raw textarea using same anchors
    const now = Date.now();
    if (now - (lastScrollPositions.current as any).lastPreviewScrollTime < THROTTLE_DELAY) return;
    (lastScrollPositions.current as any).lastPreviewScrollTime = now;

    const container = previewRef.current;
    const textarea = cmRef.current?.scrollDOM || null;
    if (!container || !textarea) return;

    // If we're in sticky bottom mode and preview is still at bottom, ignore to avoid jitter
    const maxPreview = container.scrollHeight - container.clientHeight;
    if (stickyBottomRef.current && maxPreview > 0 && (maxPreview - container.scrollTop) <= BOTTOM_EPS) {
      return;
    }

    if (isSyncingRef.current && lastSourceRef.current !== 'preview') return;

    // Leaving bottom via preview -> clear sticky
    if (stickyBottomRef.current && container.scrollTop < (container.scrollHeight - container.clientHeight - LEAVE_BOTTOM_DELTA)) {
      stickyBottomRef.current = false;
    }

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

    // If previously sticky at bottom, avoid snapping back to exact bottom by nudging 1px up
    if (stickyBottomRef.current && target >= container.scrollHeight - container.clientHeight) {
      target = Math.max(0, (container.scrollHeight - container.clientHeight) - 1);
    }

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

  // Textarea-only key/select handlers removed; CMEditor handles this.

  // Attach raw scroll listener to CMEditor scroller
  const rawScrollElRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = cmRef.current?.scrollDOM ?? null;
    if (!el) return;
    if (rawScrollElRef.current === el) return; // already attached to this scroller

    const onScroll = () => handleRawScroll();
    const onWheel = () => {
      setScrollOwner('raw');
      handleRawScroll();
    };
    const onTouchMove = () => {
      setScrollOwner('raw');
      handleRawScroll();
    };
    const onPointerDown = () => setScrollOwner('raw');
    const onKeyDown = (ev: KeyboardEvent) => {
      // Keys that typically cause scrolling
      const keys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'End', 'Home', ' ']);
      if (keys.has(ev.key)) setScrollOwner('raw');
    };
    el.addEventListener('scroll', onScroll, { passive: true } as any);
    el.addEventListener('wheel', onWheel, { passive: true } as any);
    el.addEventListener('touchmove', onTouchMove, { passive: true } as any);
    el.addEventListener('pointerdown', onPointerDown, { passive: true } as any);
    el.addEventListener('keydown', onKeyDown as any, false);
    rawScrollElRef.current = el;

    return () => {
      try { el.removeEventListener('scroll', onScroll as any); } catch { }
      try { el.removeEventListener('wheel', onWheel as any); } catch { }
      try { el.removeEventListener('touchmove', onTouchMove as any); } catch { }
      try { el.removeEventListener('pointerdown', onPointerDown as any); } catch { }
      try { el.removeEventListener('keydown', onKeyDown as any); } catch { }
      if (rawScrollElRef.current === el) rawScrollElRef.current = null;
    };
  }, [editorReady, handleRawScroll, setScrollOwner]);

  // Perform an initial sync when editor/preview are ready or content changes
  useEffect(() => {
    const raw = cmRef.current?.scrollDOM;
    if (raw && previewRef.current) {
      syncPreviewFromRaw(raw);
    }
  }, [editorReady, debouncedContent, syncPreviewFromRaw]);

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
  const handleContentChange = useCallback((newValue: string) => {
    performanceMonitor.start('content-change');

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
        const result = renumberNumberedLists(newValue, undefined);

        // Only update if content actually changed
        if (result.content !== newValue) {
          setEditContent(result.content);
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

  // CMEditor manages focus and attributes; no textarea to initialize.

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
          codeBlockFontSize={codeBlockFontSize}
        />
      </div>
    );

    // Use RAF for non-blocking rendering
    batchDOMUpdates(() => {
      performanceMonitor.end('preview-render');
    });

    return preview;
  }, [debouncedContent, isPending, selectedNote?.id, selectedNote?.content, isSignedIn, codeBlockFontSize]);

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

  useEffect(() => {
    const container = previewRef.current;
    const editorApi = cmRef.current;
    if (!container || !editorApi) return;

    let rafId: number | null = null;

    const pickTopVisibleBlock = (entries: IntersectionObserverEntry[]) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      return visible[0]?.target as HTMLElement | undefined;
    };

    const io = new IntersectionObserver((entries) => {
      // Only drive editor from preview when user is scrolling preview
      if (scrollOwnerRef.current !== 'preview') return;
      if (isSyncingRef.current && lastSourceRef.current !== 'preview') return;

      const topEl = pickTopVisibleBlock(entries);
      if (!topEl) return;

      const startAttr = topEl.getAttribute('data-start-line');
      const startLine = startAttr ? parseInt(startAttr, 10) : NaN;
      if (!Number.isFinite(startLine)) return;

      // debounce with RAF to avoid jitter
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // Set syncing flag to prevent recursive sync
        isSyncingRef.current = true;
        lastSourceRef.current = 'preview';
        scrollEditorToStartLine(startLine);
        // Release syncing flag after scroll
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
          lastSourceRef.current = null;
        });
      });
    }, {
      root: container,
      // Use a negative root margin to trigger early
      rootMargin: '-8px 0px 0px 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    });

    // Observe all nodes with start/end line attributes
    const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-start-line][data-end-line]'));
    nodes.forEach(n => io.observe(n));

    // Re-attach observer when content changes
    const reconnect = () => {
      io.disconnect();
      const latest = Array.from(container.querySelectorAll<HTMLElement>('[data-start-line][data-end-line]'));
      latest.forEach(n => io.observe(n));
    };

    // Reconnect observer on content change
    reconnect();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      io.disconnect();
    };
  }, [debouncedContent, scrollEditorToStartLine]);

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
        className="flex flex-col min-h-0 border-r border-gray-500"
        style={{
          backgroundColor: '#31363F',
          width: `${leftPaneWidth}%`
        }}
      >
        <EditorToolbar
          editContent={editContent}
          setEditContent={setEditContent}
          textareaRef={undefined as any}
          cmApiRef={cmRef as any}
          onPasteImage={() => cmRef.current?.focus()}
          isInTable={isInTable}
          onTableAction={handleTableAction}
        />
        <div className="flex-1 min-h-0 overflow-hidden relative p-0">
          <CMEditor
            ref={cmRef as any}
            value={editContent}
            onChange={handleContentChange}
            tabSize={tabSize}
            fontSize={fontSize}
            className="w-full h-full"
            onReady={(api) => { api.focus(); setEditorReady(true); }}
            onPasteImage={async (file) => {
              const result = await uploadPastedImage(file);
              return result?.markdownLink ?? null;
            }}
            onSelectionChange={() => {
              try {
                caretLineRef.current = cmRef.current?.getSelectionLine() ?? 0;
                lastCaretChangeRef.current = Date.now();
              } catch { }
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
        className="flex flex-col min-h-0"
        style={{
          backgroundColor: notesTheme === 'light' ? '#ffffff' : 'bg-main',
          width: `${100 - leftPaneWidth}%`
        }}
      >
        <div
          ref={previewRef}
          className="preview-content flex-1 overflow-y-auto p-3.5"
          onScroll={handlePreviewScroll}
          onWheel={() => setScrollOwner('preview')}
          onTouchMove={() => setScrollOwner('preview')}
          onPointerDown={() => setScrollOwner('preview')}
          onKeyDown={() => setScrollOwner('preview')}
          style={{
            scrollBehavior: 'auto',
            willChange: 'scroll-position',
            contain: 'content',
            backgroundColor: notesTheme === 'light' ? '#ffffff' : 'bg-main'
          }}
        >
          <div className={`prose max-w-none w-full m-0 p-0 pb-4 ${notesTheme === 'light' ? 'prose-gray' : 'prose-invert'}`} style={{ fontSize: previewFontSize }}>
            <style jsx>{`
              /* Enhanced KaTeX mobile responsiveness */
              .katex { 
                color: ${notesTheme === 'light' ? '#111827' : '#e5e7eb'} !important;
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
              
              /* KaTeX theme adjustments */
              .katex .accent {
                color: ${notesTheme === 'light' ? '#111827' : '#e5e7eb'} !important;
              }
              .katex .mord {
                color: ${notesTheme === 'light' ? '#111827' : '#e5e7eb'} !important;
              }
              .katex .mbin, .katex .mrel {
                color: ${notesTheme === 'light' ? '#2563eb' : '#6b7595'} !important;
              }
              .katex .mopen, .katex .mclose {
                color: ${notesTheme === 'light' ? '#d97706' : '#fbbf24'} !important;
              }
              .katex .mfrac > span {
                border-color: ${notesTheme === 'light' ? '#d1d5db' : '#6b7595'} !important;
              }
              .katex .sqrt > .sqrt-line {
                border-top-color: ${notesTheme === 'light' ? '#d1d5db' : '#6b7595'} !important;
              }
              
              /* Scroll optimization */
              .preview-content {
                scroll-behavior: auto !important;
                background-color: ${notesTheme === 'light' ? '#ffffff' : '#222831'} !important;
                overscroll-behavior: contain;
                contain: content;
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
              
              /* Light mode prose styles */
              .prose-gray h1, .prose-gray h2, .prose-gray h3, .prose-gray h4, .prose-gray h5, .prose-gray h6 {
                color: #111827 !important;
              }
              .prose-gray p {
                color: #374151 !important;
              }
              .prose-gray strong {
                color: #111827 !important;
              }
              .prose-gray blockquote {
                border-left-color: #e5e7eb !important;
                color: #6b7280 !important;
                background-color: #f9fafb !important;
                padding: 0.75rem 1rem !important;
                border-radius: 0.375rem !important;
              }
              .prose-gray code {
                color: #dc2626 !important;
                background-color: #f3f4f6 !important;
                padding: 0.125rem 0.25rem !important;
                border-radius: 0.25rem !important;
              }
              /* Allow theme CSS to style code blocks in light mode */
              /* .prose-gray pre and pre code colors are intentionally not overridden */
              .prose-gray a {
                color: #2563eb !important;
              }
              .prose-gray a:hover {
                color: #1d4ed8 !important;
              }
              .prose-gray ul li::marker,
              .prose-gray ol li::marker {
                color: #6b7280 !important;
              }
              .prose-gray table {
                border-color: #e5e7eb !important;
              }
              .prose-gray thead th {
                background-color: #f9fafb !important;
                border-bottom-color: #e5e7eb !important;
                color: #111827 !important;
              }
              .prose-gray tbody td {
                border-bottom-color: #e5e7eb !important;
                color: #374151 !important;
              }
              
              /* Dark mode prose styles (existing) */
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
              /* Allow theme CSS to style code blocks in dark mode as well */
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
