'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Note } from './types';
import { MemoizedMarkdown, OptimizedMarkdownBlocksAST } from '../_utils';
import { EditorToolbar } from './EditorToolbar';
import { useAdvancedDebounce } from '@/app/lib/hooks/useDebounce';
import { performanceMonitor, batchDOMUpdates } from '@/app/lib/optimizations';


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
  // Split mode sync props
  isScrollingSynced: boolean;
  setIsScrollingSynced: (synced: boolean) => void;
  scrollTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  // scrollThrottleRef: React.MutableRefObject<NodeJS.Timeout | null>;
  scrollThrottleRef: React.RefObject<number | null>;
  lastScrollSource: React.RefObject<'raw' | 'preview' | null>;
  tabSize?: number;
}

export const NoteSplitEditor: React.FC<NoteSplitEditorProps> = ({
  editContent,
  setEditContent,
  notes,
  selectedNote,
  setNotes,
  setSelectedNote,
  isSignedIn,
  driveService,
  isScrollingSynced,
  setIsScrollingSynced,
  scrollTimeoutRef,
  scrollThrottleRef,
  lastScrollSource,
  tabSize = 2
}) => {

  // Ref for textarea to enable context menu functionality
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Split pane resize state
  const [leftPaneWidth, setLeftPaneWidth] = useState(40); // Percentage
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

  const scrollHeightCache = useRef<{
    raw?: { scrollHeight: number; clientHeight: number; timestamp: number };
    preview?: { scrollHeight: number; clientHeight: number; timestamp: number };
  }>({});

  const SCROLL_THRESHOLD = 5; // pixels
  const CACHE_DURATION = 150; // ms
  const THROTTLE_DELAY = 8; // ~120fps

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
    setLeftPaneWidth(40);
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

  const lastScrollPositions = useRef<{
    raw: number;
    preview: number;
  }>({ raw: 0, preview: 0 });

  // Optimized getScrollMetrics function
  const getScrollMetrics = useCallback((element: HTMLElement, type: 'raw' | 'preview') => {
    const now = Date.now();
    const cached = scrollHeightCache.current[type];

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return {
        maxScroll: cached.scrollHeight - cached.clientHeight
      };
    }

    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    scrollHeightCache.current[type] = {
      scrollHeight,
      clientHeight,
      timestamp: now
    };

    return { maxScroll };
  }, []);

  const syncScroll = useCallback(
    (sourceElement: HTMLElement, targetElement: HTMLElement, source: 'raw' | 'preview') => {
      if (!sourceElement || !targetElement || isScrollingSynced) return;
      if (lastScrollSource.current === source) return;

      const currentScrollTop = sourceElement.scrollTop;
      const lastScrollTop = lastScrollPositions.current[source];

      // Skip if scroll position hasn't changed significantly
      if (Math.abs(currentScrollTop - lastScrollTop) < SCROLL_THRESHOLD) return;

      if (scrollThrottleRef.current) {
        cancelAnimationFrame(scrollThrottleRef.current);
      }

      scrollThrottleRef.current = requestAnimationFrame(() => {
        const sourceMetrics = getScrollMetrics(sourceElement, source);
        const targetType = source === 'raw' ? 'preview' : 'raw';
        const targetMetrics = getScrollMetrics(targetElement, targetType);

        if (sourceMetrics.maxScroll <= 0 || targetMetrics.maxScroll <= 0) return;

        setIsScrollingSynced(true);
        lastScrollSource.current = source;

        const scrollPercentage = Math.max(0, Math.min(1,
          currentScrollTop / sourceMetrics.maxScroll
        ));
        const targetScrollTop = Math.round(scrollPercentage * targetMetrics.maxScroll);

        lastScrollPositions.current[source] = currentScrollTop;

        targetElement.style.scrollBehavior = 'auto';
        targetElement.scrollTop = targetScrollTop;

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrollingSynced(false);
          lastScrollSource.current = null;
        }, 32);
      }) as any;
    },
    [isScrollingSynced, setIsScrollingSynced, scrollTimeoutRef, scrollThrottleRef, lastScrollSource, getScrollMetrics]
  );

  const handleRawScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (isScrollingSynced) return;

    const now = Date.now();
    if (now - (lastScrollPositions.current as any).lastRawScrollTime < THROTTLE_DELAY) return;
    (lastScrollPositions.current as any).lastRawScrollTime = now;

    const rawElement = e.currentTarget;
    const previewElement = document.querySelector('.preview-content') as HTMLElement;

    if (previewElement) {
      syncScroll(rawElement, previewElement, 'raw');
    }
  }, [syncScroll, isScrollingSynced]);

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingSynced) return;

    const now = Date.now();
    if (now - (lastScrollPositions.current as any).lastPreviewScrollTime < THROTTLE_DELAY) return;
    (lastScrollPositions.current as any).lastPreviewScrollTime = now;

    const previewElement = e.currentTarget;
    const rawElement = document.querySelector('.raw-content') as HTMLTextAreaElement;
    if (rawElement) {
      syncScroll(previewElement, rawElement, 'preview');
    }
  }, [syncScroll, isScrollingSynced]);


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
        const prefix = bulletMatch[1] + (bulletMatch[2].match(/\d+\./) ? (parseInt(bulletMatch[2]) + 1) + '. ' : bulletMatch[2]);
        setEditContent(
          value.slice(0, start) + '\n' + prefix + value.slice(end)
        );
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
        return;
      }
    }
  }, [setEditContent, tabSize]);

  // Optimized onChange handler with performance monitoring
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    performanceMonitor.start('content-change');
    
    const newValue = e.target.value;
    setEditContent(newValue);

    // Batch updates to avoid excessive re-renders
    pendingUpdateRef.current = newValue;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      if (pendingUpdateRef.current !== null) {
        // Trigger any expensive operations here if needed
        pendingUpdateRef.current = null;
      }
      performanceMonitor.end('content-change');
    }, 50);
  }, [setEditContent]);

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
        />
      </div>
    );
    
    // Use RAF for non-blocking rendering
    batchDOMUpdates(() => {
      performanceMonitor.end('preview-render');
    });
    
    return preview;
  }, [debouncedContent, isPending, notes, selectedNote, setEditContent, setNotes, setSelectedNote, isSignedIn, driveService]);

  useEffect(() => {
    scrollHeightCache.current = {};
  }, [editContent]);

  return (
    <div className="flex h-full w-full relative">
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
        />
        <div className="flex-1 px-4 py-4 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={handleContentChange}
            onScroll={handleRawScroll}
            onKeyDown={handleKeyDown}
            className="raw-content w-full h-full resize-none bg-transparent text-gray-200 focus:outline-none font-mono text-sm leading-relaxed"
            placeholder="Write your note in Markdown..."
            style={{
              scrollBehavior: 'auto',
              backgroundColor: '#31363F',
              // Performance optimizations
              willChange: 'scroll-position',
              containIntrinsicSize: '1px 1000px'
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
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
          <div className="prose prose-invert max-w-none w-full">
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
