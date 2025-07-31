'use client';

import { useMemo } from 'react';
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
}

export const NotePreview: React.FC<NotePreviewProps> = ({
  selectedNote,
  notes,
  setNotes,
  setSelectedNote,
  isSignedIn,
  driveService
}) => {
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
      {/* Note Content */}
      <div className="flex h-full">
        {/* Outline Sidebar */}
        <div className="w-60 flex-shrink-0 hidden lg:block">
          <NoteOutlineSidebar content={selectedNote.content} />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-8 md:px-16 lg:px-32 xl:px-56 py-6 overflow-y-auto">
          <div className="prose prose-invert max-w-none prose-sm sm:prose-base lg:prose-lg">
            <style jsx>{`
          /* Mobile optimizations */
          @media (max-width: 640px) {
            .prose {
              font-size: 0.9rem !important;
              line-height: 1.6 !important;
            }
            .prose h1 { font-size: 1.5rem !important; }
            .prose h2 { font-size: 1.3rem !important; }
            .prose h3 { font-size: 1.1rem !important; }
            .prose p { margin-bottom: 0.75rem !important; }
            .prose li { margin-bottom: 0.25rem !important; }
          }
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
        `}</style>
            {memoizedMarkdown}
          </div>
        </div>
      </div>
    </div>
  );
};
