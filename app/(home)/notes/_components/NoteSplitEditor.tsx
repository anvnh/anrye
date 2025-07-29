'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Note } from './types';
import { MemoizedMarkdown } from '../_utils';
import { EditorContextMenu } from './EditorContextMenu';


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
  scrollTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  scrollThrottleRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastScrollSource: React.MutableRefObject<'raw' | 'preview' | null>;
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
  const [leftPaneWidth, setLeftPaneWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  // Debounced content for markdown rendering to reduce lag
  const [debouncedContent, setDebouncedContent] = useState(editContent);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(editContent);
    }, 300); // 300ms debounce for markdown rendering
    
    return () => clearTimeout(timer);
  }, [editContent]);
  
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
  
  const syncScroll = useCallback((sourceElement: HTMLElement, targetElement: HTMLElement, source: 'raw' | 'preview') => {
    if (!sourceElement || !targetElement || isScrollingSynced) return;
    
    // Throttle scroll events to improve performance
    if (scrollThrottleRef.current) {
      clearTimeout(scrollThrottleRef.current);
    }
    
    scrollThrottleRef.current = setTimeout(() => {
      if (lastScrollSource.current === source) return;
      
      setIsScrollingSynced(true);
      lastScrollSource.current = source;
      
      const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;
      const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;
      
      if (sourceScrollHeight <= 0 || targetScrollHeight <= 0) {
        setIsScrollingSynced(false);
        lastScrollSource.current = null;
        return;
      }
      
      const scrollPercentage = Math.max(0, Math.min(1, sourceElement.scrollTop / sourceScrollHeight));
      const targetScrollTop = scrollPercentage * targetScrollHeight;
      
      // Smooth scroll sync
      targetElement.style.scrollBehavior = 'auto';
      targetElement.scrollTop = targetScrollTop;
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Reset sync flag after a short delay
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollingSynced(false);
        lastScrollSource.current = null;
      }, 50); // Reduced from 150ms to 50ms for better responsiveness
    }, 32); // Reduced from 16ms to 32ms (~30fps instead of 60fps) for better performance
  }, [isScrollingSynced, setIsScrollingSynced, scrollTimeoutRef, scrollThrottleRef, lastScrollSource]);

  const handleRawScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (isScrollingSynced) return;
    const rawElement = e.currentTarget;
    const previewElement = document.querySelector('.preview-content') as HTMLElement;
    
    if (previewElement) {
      syncScroll(rawElement, previewElement, 'raw');
    }
  }, [syncScroll, isScrollingSynced]);

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingSynced) return;
    const previewElement = e.currentTarget;
    const rawElement = document.querySelector('.raw-content') as HTMLTextAreaElement;
    if (rawElement) {
      syncScroll(previewElement, rawElement, 'preview');
    }
  }, [syncScroll, isScrollingSynced]);


  // Handle Tab key for indentation (custom tabSize)
  const handleTabKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const indent = ' '.repeat(tabSize);
      setEditContent(value.slice(0, start) + indent + value.slice(end));
      // Move cursor after inserted indent
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
    }
  }, [setEditContent, tabSize]);

  // Optimized onChange handler
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  }, [setEditContent]);

  // Optimized real-time preview with debounced content
  const realtimePreview = useMemo(() => {
    return (
      <MemoizedMarkdown 
        content={debouncedContent}
        notes={notes}
        selectedNote={selectedNote}
        isEditing={true}
        editContent={debouncedContent}
        setEditContent={setEditContent}
        setNotes={setNotes}
        setSelectedNote={setSelectedNote}
        isSignedIn={isSignedIn}
        driveService={driveService}
      />
    );
  }, [debouncedContent, notes, selectedNote, setEditContent, setNotes, setSelectedNote, isSignedIn, driveService]);

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
        <div className="flex-1 px-4 py-4 overflow-hidden">
          <EditorContextMenu 
            editContent={editContent} 
            setEditContent={setEditContent}
            textareaRef={textareaRef}
          >
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={handleContentChange}
              onScroll={handleRawScroll}
              onKeyDown={handleTabKey}
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
          </EditorContextMenu>
        </div>
      </div>
      
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="w-1 bg-gray-500 hover:bg-gray-400 cursor-col-resize flex-shrink-0 relative group"
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
              .katex { 
                color: #e5e7eb !important;
                font-size: 1.1em !important;
              }
              .katex-display {
                margin: 1.5em 0 !important;
                text-align: center !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
              }
              .katex-display > .katex {
                display: inline-block !important;
                white-space: nowrap !important;
              }
              .math-display {
                overflow-x: auto;
                padding: 0.5rem 0;
                text-align: center;
              }
              .math-inline {
                display: inline;
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
