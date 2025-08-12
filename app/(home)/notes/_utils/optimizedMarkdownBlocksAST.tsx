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
  let blockType: 'text' | 'code' = 'text';

  let insideFence = false;
  let fenceChar: '```' | '~~~' | '' = '';
  let codeStartLine = 0;
  let codeLines: string[] = [];

  const flushCurrentBlock = (endLine: number) => {
    if (currentBlock.trim()) {
      const key = simpleHash(currentBlock);
      blocks.push({ type: blockType, value: currentBlock, startLine: blockStartLine, endLine, key });
    }
    currentBlock = '';
    blockType = 'text';
  };

  const flushCodeBlock = (endLine: number) => {
    const codeValue = codeLines.join('\n');
    const key = simpleHash(codeValue);
    blocks.push({ type: 'code', value: codeValue, startLine: codeStartLine, endLine, key });
    codeLines = [];
    insideFence = false;
    fenceChar = '';
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    if (insideFence) {
      codeLines.push(line);
      const trimmed = line.trim();
      // Close fence must match the opening fence type
      if ((fenceChar === '```' && /^```\s*$/.test(trimmed)) || (fenceChar === '~~~' && /^~~~\s*$/.test(trimmed))) {
        flushCodeBlock(lineIndex);
      }
      continue;
    }

    // Detect fenced code block start
    const fenceMatch = line.match(/^(```|~~~)(\w+)?\s*$/);
    if (fenceMatch) {
      // Flush any pending text block before starting code
      if (currentBlock.trim()) {
        flushCurrentBlock(lineIndex - 1);
      }
      insideFence = true;
      fenceChar = (fenceMatch[1] as '```' | '~~~');
      codeStartLine = lineIndex;
      codeLines = [line];
      continue;
    }

    // Image lines are standalone blocks
    if (isImageLine(line)) {
      if (currentBlock.trim()) {
        flushCurrentBlock(lineIndex - 1);
      }
      const imageKey = simpleHash(line);
      blocks.push({ type: 'image', value: line, startLine: lineIndex, endLine: lineIndex, key: imageKey });
      blockStartLine = lineIndex + 1;
      continue;
    }

    // Accumulate non-image, non-code content
    if (currentBlock === '') {
      blockStartLine = lineIndex;
    }
    currentBlock += (currentBlock ? '\n' : '') + line;
  }

  // Flush any remaining code or text blocks
  if (insideFence && codeLines.length) {
    flushCodeBlock(lines.length - 1);
  }
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
    // For code blocks, only re-render when content or language fence changes
    if (prev.blockType === 'code' && next.blockType === 'code') {
      return prev.content === next.content;
    }
    
    // For other blocks, use standard comparison but ignore folders changes
    return (
      prev.content === next.content && 
      prev.selectedNote?.id === next.selectedNote?.id &&
      prev.selectedNote?.content === next.selectedNote?.content &&
      prev.isSignedIn === next.isSignedIn
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
}> = React.memo(({
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
}, (prevProps, nextProps) => {
  // Only re-render when content or selected note actually changes
  return (
    prevProps.content === nextProps.content &&
    prevProps.selectedNote?.id === nextProps.selectedNote?.id &&
    prevProps.selectedNote?.content === nextProps.selectedNote?.content &&
    prevProps.isSignedIn === nextProps.isSignedIn
  );
});
