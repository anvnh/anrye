'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { List, X, Network } from 'lucide-react';
import { Note } from './types';
import { MemoizedMarkdown } from '../_utils';
import NoteOutlineSidebar from './NoteOutlineSidebar';
import BacklinksPanel from './BacklinksPanel';
import CalendarPanel from './CalendarPanel';

interface NotePreviewProps {
  selectedNote: Note;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  isSignedIn: boolean;
  driveService: {
    updateFile: (fileId: string, content: string) => Promise<void>;
  };
  previewFontSize?: string;
  codeBlockFontSize?: string;
}

// Utility function to check if content has headings
const hasHeadings = (content: string): boolean => {
  const lines = content.split('\n');
  return lines.some(line => /^(#{1,6})\s+(.+)$/.test(line));
};

export const NotePreview: React.FC<NotePreviewProps> = ({
  selectedNote,
  notes,
  setNotes,
  setSelectedNote,
  isSignedIn,
  driveService,
  previewFontSize = '16px',
  codeBlockFontSize = '14px'
}) => {
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isBacklinksOpen, setIsBacklinksOpen] = useState(false);
  const outlineRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const backlinksRef = useRef<HTMLDivElement>(null);
  const backlinksBtnRef = useRef<HTMLButtonElement>(null);
  const backlinksBackdropRef = useRef<HTMLDivElement>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState<'links' | 'calendar'>('links');

  // Check if the note has headings
  const hasOutline = useMemo(() => hasHeadings(selectedNote.content), [selectedNote.content]);

  // Handle wikilink navigation
  const handleNavigateToNote = useCallback((noteId: string) => {
    const targetNote = notes.find(note => note.id === noteId);
    if (targetNote) setSelectedNote(targetNote);
  }, [notes, setSelectedNote]);

  // Build a minimal wikilink index that only changes when titles/ids/paths change
  const wikilinkSignature = useMemo(
    () => notes.map(n => `${n.id}|${n.title}|${n.path ?? ''}`).join('::'),
    [notes]
  );
  const wikilinkNotes = useMemo(() => {
    return notes.map(n => ({ id: n.id, title: n.title, path: (n as any).path }));
  }, [wikilinkSignature]);

  // GSAP animations for outline
  useEffect(() => {
    if (!outlineRef.current || !backdropRef.current) return;

    const outline = outlineRef.current;
    const backdrop = backdropRef.current;

    if (isOutlineOpen) {
      // Animate backdrop fade in
      gsap.fromTo(backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      // Animate outline slide in from left
      gsap.fromTo(outline,
        { x: -320, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    } else {
      // Animate backdrop fade out
      gsap.to(backdrop, { opacity: 0, duration: 0.2, ease: "power2.in" });

      // Animate outline slide out to left
      gsap.to(outline, { x: -320, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }, [isOutlineOpen]);

  // GSAP animations for backlinks panel
  useEffect(() => {
    if (!backlinksRef.current || !backlinksBackdropRef.current) return;

    const backlinksPanel = backlinksRef.current;
    const backlinksBackdrop = backlinksBackdropRef.current;

    if (isBacklinksOpen) {
      // Animate backdrop fade in
      gsap.fromTo(backlinksBackdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      // Animate backlinks panel slide in from right
      gsap.fromTo(backlinksPanel,
        { x: 320, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    } else {
      // Animate backdrop fade out
      gsap.to(backlinksBackdrop, { opacity: 0, duration: 0.2, ease: "power2.in" });

      // Animate backlinks panel slide out to right
      gsap.to(backlinksPanel, { x: 320, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }, [isBacklinksOpen]);

  // Touch gesture handling for mobile backlinks panel
  useEffect(() => {
    if (!backlinksRef.current) return;

    const panel = backlinksRef.current;
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      panel.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;

      // Only allow swiping to the right (closing gesture)
      if (deltaX > 0) {
        const clampedDelta = Math.min(deltaX, 320);
        panel.style.transform = `translateX(${clampedDelta}px)`;

        // Update backdrop opacity based on swipe progress
        if (backlinksBackdropRef.current) {
          const opacity = 1 - (clampedDelta / 320);
          backlinksBackdropRef.current.style.opacity = opacity.toString();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;

      isDragging = false;
      panel.style.transition = '';

      const deltaX = currentX - startX;

      // Close if swiped more than 25% of panel width
      if (deltaX > 80) {
        setIsBacklinksOpen(false);
      } else {
        // Snap back to original position
        panel.style.transform = '';
        if (backlinksBackdropRef.current) {
          backlinksBackdropRef.current.style.opacity = '1';
        }
      }
    };

    panel.addEventListener('touchstart', handleTouchStart, { passive: true });
    panel.addEventListener('touchmove', handleTouchMove, { passive: true });
    panel.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isBacklinksOpen]);

  // Button animation on hover
  useEffect(() => {
    if (!buttonRef.current) return;

    const button = buttonRef.current;

    const handleMouseEnter = () => {
      gsap.to(button, { scale: 1.05, duration: 0.2, ease: "power2.out" });
    };

    const handleMouseLeave = () => {
      gsap.to(button, { scale: 1, duration: 0.2, ease: "power2.out" });
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Optimized markdown rendering - memoized to prevent re-renders on large files
  const memoizedMarkdown = useMemo(() => {
    return (
      <MemoizedMarkdown
        content={selectedNote.content}
        // Pass minimal notes for wikilink resolution to keep prop stable across content-only updates
        notes={wikilinkNotes as any}
        selectedNote={selectedNote}
        isEditing={false}
        editContent=""
        setEditContent={() => { }}
        setNotes={setNotes}
        setSelectedNote={setSelectedNote}
        isSignedIn={isSignedIn}
        driveService={driveService}
        onNavigateToNote={handleNavigateToNote}
        codeBlockFontSize={codeBlockFontSize}
      />
    );
  }, [selectedNote, wikilinkNotes, setNotes, setSelectedNote, isSignedIn, driveService, handleNavigateToNote, codeBlockFontSize]);

  return (
    <div className="relative h-full">
      {/* Mobile Toggle Buttons */}
      <div className={`lg:hidden absolute top-4 right-4 z-50 flex gap-2 transition-opacity duration-300 ${isBacklinksOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Backlinks Toggle Button */}
        <button
          ref={backlinksBtnRef}
          onClick={() => setIsBacklinksOpen(!isBacklinksOpen)}
          className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 transition-colors"
          title="Toggle backlinks"
        >
          {isBacklinksOpen ? <X size={20} /> : <Network size={20} />}
        </button>

        {/* Outline Toggle Button */}
        {hasOutline && (
          <button
            ref={buttonRef}
            onClick={() => setIsOutlineOpen(!isOutlineOpen)}
            className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 transition-colors"
            title="Toggle outline"
          >
            {isOutlineOpen ? <X size={20} /> : <List size={20} />}
          </button>
        )}
      </div>

      {/* Mobile Backlinks Overlay */}
      {isBacklinksOpen && (
        <div className="lg:hidden absolute inset-0 z-40">
          {/* Backdrop */}
          <div
            ref={backlinksBackdropRef}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsBacklinksOpen(false)}
          />

          {/* Backlinks Panel */}
          <div
            ref={backlinksRef}
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-main border-l border-gray-700 shadow-xl"
          >
            {/* Swipe indicator */}
            <div className="absolute top-4 left-2 w-1 h-8 bg-gray-500/30 rounded-full"></div>
            <div className="h-full pb-[env(safe-area-inset-bottom)] flex flex-col">
              {/* simple segmented buttons */}
              <div className="sticky top-0 z-10 bg-main/80 backdrop-blur border-b border-gray-700/50 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRightSidebarTab('links')}
                    className={`text-sm rounded-md py-1.5 ${rightSidebarTab === 'links'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    Links
                  </button>
                  <button
                    onClick={() => setRightSidebarTab('calendar')}
                    className={`text-sm rounded-md py-1.5 ${rightSidebarTab === 'calendar'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    Calendar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {rightSidebarTab === 'links' ? (
                  <BacklinksPanel
                    selectedNote={selectedNote}
                    allNotes={notes}
                    isMobile={true}
                    onClose={() => setIsBacklinksOpen(false)}
                    onNavigateToNote={(noteId) => {
                      handleNavigateToNote(noteId);
                      setIsBacklinksOpen(false);
                    }}
                  />
                ) : (
                  <CalendarPanel />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Outline Overlay */}
      {hasOutline && isOutlineOpen && (
        <div className="lg:hidden absolute inset-0 z-40">
          {/* Backdrop */}
          <div
            ref={backdropRef}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOutlineOpen(false)}
          />

          {/* Outline Panel */}
          <div
            ref={outlineRef}
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-main border-r border-gray-700 shadow-xl"
          >
            <div className="h-full pb-[env(safe-area-inset-bottom)]">
              <NoteOutlineSidebar content={selectedNote.content} />
            </div>
          </div>
        </div>
      )}

      {/* Note Content */}
      <div className="flex h-full">
        {/* Desktop Outline Sidebar */}
        {hasOutline && (
          <div className="w-60 flex-shrink-0 hidden lg:block">
            <NoteOutlineSidebar content={selectedNote.content} />
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 px-4 sm:px-8 md:px-16 lg:px-8 xl:px-16 py-6 overflow-y-auto`}>
          <div className="prose prose-invert max-w-none" style={{ fontSize: previewFontSize }}>
            <style jsx>{`
          /* Mobile optimizations - respect font-size settings */
          @media (max-width: 640px) {
            .prose {
              line-height: 1.6 !important;
            }
            .prose p { margin-bottom: 0.75rem !important; }
            .prose li { margin-bottom: 0.25rem !important; }
          }
          
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
          
          /* Ensure proper scrolling on mobile */
          .prose {
            overflow-x: hidden !important;
          }
          
          .prose * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        `}</style>
            {memoizedMarkdown}
          </div>
        </div>

        {/* Desktop Right Sidebar: Links | Calendar */}
        <div className="w-72 flex-shrink-0 hidden lg:block border-l border-gray-600/30">
          <div className="h-full flex flex-col">
            <div className="sticky top-0 z-10 bg-main/80 backdrop-blur border-b border-gray-700/50 p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRightSidebarTab('links')}
                  className={`text-sm rounded-md py-1.5 ${rightSidebarTab === 'links'
                    ? 'bg-secondary text-white'
                    : 'bg-main text-gray-300 hover:bg-gray-700'}`}
                >
                  Links
                </button>
                <button
                  onClick={() => setRightSidebarTab('calendar')}
                  className={`text-sm rounded-md py-1.5 ${rightSidebarTab === 'calendar'
                    ? 'bg-secondary text-white'
                    : 'bg-main text-gray-300 hover:bg-gray-700'}`}
                >
                  Calendar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {rightSidebarTab === 'links' ? (
                <BacklinksPanel
                  selectedNote={selectedNote}
                  allNotes={notes}
                  isMobile={false}
                  onNavigateToNote={handleNavigateToNote}
                />
              ) : (
                <div className=''>
                  <CalendarPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
