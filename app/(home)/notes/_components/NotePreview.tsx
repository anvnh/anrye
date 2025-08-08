'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { List, X } from 'lucide-react';
import { Note } from './types';
import { MemoizedMarkdown } from '../_utils';
import NoteOutlineSidebar from './NoteOutlineSidebar';

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
  previewFontSize = '16px'
}) => {
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const outlineRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if the note has headings
  const hasOutline = useMemo(() => hasHeadings(selectedNote.content), [selectedNote.content]);

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
        notes={notes}
        selectedNote={selectedNote}
        isEditing={false}
        editContent=""
        setEditContent={() => { }}
        setNotes={setNotes}
        setSelectedNote={setSelectedNote}
        isSignedIn={isSignedIn}
        driveService={driveService}
      />
    );
  }, [selectedNote, notes, setNotes, setSelectedNote, isSignedIn, driveService]);

  return (
    <div className="relative h-full">
      {/* Mobile Outline Toggle Button */}
      {hasOutline && (
        <div className="lg:hidden absolute top-4 right-4 z-50">
          <button
            ref={buttonRef}
            onClick={() => setIsOutlineOpen(!isOutlineOpen)}
            className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 transition-colors"
            title="Toggle outline"
          >
            {isOutlineOpen ? <X size={20} /> : <List size={20} />}
          </button>
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
        <div className={`${hasOutline ? 'flex-1' : 'w-full'} px-4 sm:px-8 md:px-16 lg:px-32 xl:px-32 py-6 overflow-y-auto`}>
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
      </div>
    </div>
  );
};
