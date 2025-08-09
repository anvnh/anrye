import React from 'react';
import { MemoizedMarkdown } from '../_utils';
import { Note } from '../_components/types';

// Simple hash function to create stable keys for blocks
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Check if a line contains an image
function isImageLine(line: string): boolean {
  return /^\s*!\[.*?\]\(.*?\)\s*$/.test(line.trim());
}

// Parse markdown content and split into granular blocks, isolating images
export function splitMarkdownBlocksAST(content: string): { type: string; value: string; startLine: number; endLine: number; key: string }[] {
  const lines = content.split('\n');
  const blocks: { type: string; value: string; startLine: number; endLine: number; key: string }[] = [];
  
  let currentBlock = '';
  let blockStartLine = 0;
  let blockType = 'text';
  
  const flushCurrentBlock = (endLine: number) => {
    if (currentBlock.trim()) {
      const key = simpleHash(currentBlock);
      blocks.push({
        type: blockType,
        value: currentBlock,
        startLine: blockStartLine,
        endLine: endLine,
        key
      });
    }
    currentBlock = '';
    blockType = 'text';
  };
  
  lines.forEach((line, lineIndex) => {
    if (isImageLine(line)) {
      // Flush any accumulated content before the image
      if (currentBlock.trim()) {
        flushCurrentBlock(lineIndex - 1);
      }
      
      // Create a standalone image block
      const imageKey = simpleHash(line);
      blocks.push({
        type: 'image',
        value: line,
        startLine: lineIndex,
        endLine: lineIndex,
        key: imageKey
      });
      
      // Reset for next block
      blockStartLine = lineIndex + 1;
    } else {
      // Accumulate non-image content
      if (currentBlock === '') {
        blockStartLine = lineIndex;
      }
      currentBlock += (currentBlock ? '\n' : '') + line;
    }
  });
  
  // Flush any remaining content
  if (currentBlock.trim()) {
    flushCurrentBlock(lines.length - 1);
  }
  
  return blocks;
}

// Memoized block renderer with enhanced comparison for image blocks
const MemoizedMarkdownBlock = React.memo(
  ({
    content,
    blockType,
    notes,
    selectedNote,
    setEditContent,
    setNotes,
    setSelectedNote,
    isSignedIn,
    driveService,
    onNavigateToNote
  }: {
    content: string;
    blockType: string;
    notes: Note[];
    selectedNote: Note | null;
    setEditContent: (content: string) => void;
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
    isSignedIn: boolean;
    driveService: any;
    onNavigateToNote?: (noteId: string) => void;
  }) => {
    return (
      <MemoizedMarkdown
        content={content}
        notes={notes}
        selectedNote={selectedNote}
        isEditing={true}
        editContent={content}
        setEditContent={setEditContent}
        setNotes={setNotes}
        setSelectedNote={setSelectedNote}
        isSignedIn={isSignedIn}
        driveService={driveService}
        onNavigateToNote={onNavigateToNote}
      />
    );
  },
  (prev, next) => {
    // For image blocks, only re-render if the image content actually changes
    if (prev.blockType === 'image' && next.blockType === 'image') {
      return prev.content === next.content && prev.isSignedIn === next.isSignedIn;
    }
    
    // For other blocks, use standard comparison
    return (
      prev.content === next.content && 
      prev.selectedNote?.id === next.selectedNote?.id &&
      prev.isSignedIn === next.isSignedIn &&
      prev.notes.length === next.notes.length
    );
  }
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

export const OptimizedMarkdownBlocksAST: React.FC<{
  content: string;
  notes: Note[];
  selectedNote: Note | null;
  setEditContent: (content: string) => void;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  isSignedIn: boolean;
  driveService: any;
  onNavigateToNote?: (noteId: string) => void;
}> = ({
  content,
  notes,
  selectedNote,
  setEditContent,
  setNotes,
  setSelectedNote,
  isSignedIn,
  driveService,
  onNavigateToNote
}) => {
  const blocks = React.useMemo(() => splitMarkdownBlocksAST(content), [content]);
  return (
    <div>
      {blocks.map((block, i) => (
        <div 
          key={block.key} 
          data-block-index={i} 
          data-block-type={block.type}
          data-start-line={block.startLine} 
          data-end-line={block.endLine} 
          style={{ contain: 'layout paint style' }}
        >
          <MemoizedMarkdownBlock
            content={block.value}
            blockType={block.type}
            notes={notes}
            selectedNote={selectedNote}
            setEditContent={setEditContent}
            setNotes={setNotes}
            setSelectedNote={setSelectedNote}
            isSignedIn={isSignedIn}
            driveService={driveService}
            onNavigateToNote={onNavigateToNote}
          />
        </div>
      ))}
    </div>
  );
};
