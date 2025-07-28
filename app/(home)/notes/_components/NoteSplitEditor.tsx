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
  lastScrollSource
}) => {
  
  // Ref for textarea to enable context menu functionality
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Debounced content for markdown rendering to reduce lag
  const [debouncedContent, setDebouncedContent] = useState(editContent);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(editContent);
    }, 300); // 300ms debounce for markdown rendering
    
    return () => clearTimeout(timer);
  }, [editContent]);
  
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
    <div className="flex h-full w-full">
      {/* Raw Editor Side */}
      <div className="w-1/2 flex flex-col border-r border-gray-600" style={{ backgroundColor: '#111111' }}>
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
              className="raw-content w-full h-full resize-none bg-transparent text-gray-300 focus:outline-none font-mono text-sm leading-relaxed"
              placeholder="Write your note in Markdown..."
              style={{ 
                scrollBehavior: 'auto',
                backgroundColor: '#111111',
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
      
      {/* Preview Side */}
      <div className="w-1/2 flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
        <div 
          className="preview-content flex-1 px-4 py-4 overflow-y-auto"
          onScroll={handlePreviewScroll}
          style={{ 
            scrollBehavior: 'auto',
            // Performance optimizations
            willChange: 'scroll-position',
            contain: 'layout style paint',
            backgroundColor: '#1a1a1a'
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
                background-color: #1a1a1a !important;
              }
              .raw-content {
                scroll-behavior: auto !important;
                background-color: #111111 !important;
              }
              /* Force equal width split */
              .prose {
                width: 100% !important;
                max-width: none !important;
              }
              .katex .mbin, .katex .mrel {
                color: #93c5fd !important;
              }
              .katex .mopen, .katex .mclose {
                color: #fbbf24 !important;
              }
              .katex .mfrac > span {
                border-color: #6b7280 !important;
              }
              .katex .sqrt > .sqrt-line {
                border-top-color: #6b7280 !important;
              }
              /* Enhanced dark theme */
              .prose-invert h1, .prose-invert h2, .prose-invert h3, .prose-invert h4, .prose-invert h5, .prose-invert h6 {
                color: #f8fafc !important;
              }
              .prose-invert p {
                color: #e2e8f0 !important;
              }
              .prose-invert strong {
                color: #f1f5f9 !important;
              }
              .prose-invert blockquote {
                border-left-color: #64748b !important;
                color: #cbd5e1 !important;
              }
              .prose-invert code {
                color: #fbbf24 !important;
                background-color: #374151 !important;
              }
              .prose-invert pre {
                background-color: #111827 !important;
                border: 1px solid #374151 !important;
              }
              .prose-invert a {
                color: #60a5fa !important;
              }
              .prose-invert a:hover {
                color: #93c5fd !important;
              }
            `}</style>
            {realtimePreview}
          </div>
        </div>
      </div>
    </div>
  );
};
