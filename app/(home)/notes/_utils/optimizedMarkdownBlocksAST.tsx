import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
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

// Parse markdown to AST and split into top-level blocks
export function splitMarkdownBlocksAST(content: string): { type: string; value: string; startLine: number; endLine: number; key: string }[] {
  const tree = unified().use(remarkParse).parse(content);
  const blocks: { type: string; value: string; startLine: number; endLine: number; key: string }[] = [];
  let lastPos = 0;
  // Each top-level node in AST is a block
  tree.children.forEach((node: any) => {
    if (
      node.position &&
      typeof node.position.start.offset === 'number' &&
      typeof node.position.end.offset === 'number' &&
      typeof node.position.start.line === 'number'
    ) {
      const value = content.slice(node.position.start.offset, node.position.end.offset);
      const key = simpleHash(value);
      blocks.push({ type: node.type, value, startLine: node.position.start.line - 1, endLine: node.position.end.line - 1, key });
      lastPos = node.position.end.offset;
    }
  });
  if (lastPos < content.length) {
    // Estimate line number for trailing content
    const prevBlock = blocks[blocks.length - 1];
    const prevEnd = prevBlock ? prevBlock.endLine + 1 : 0;
    const trailing = content.slice(lastPos);
    const trailingLen = trailing.split('\n').length - 1;
    const key = simpleHash(trailing);
    blocks.push({ type: 'text', value: trailing, startLine: prevEnd, endLine: prevEnd + Math.max(0, trailingLen), key });
  }
  return blocks;
}

// Memoized block renderer with full MemoizedMarkdown features including callouts
const MemoizedMarkdownBlock = React.memo(
  ({
    content,
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
  (prev, next) => 
    prev.content === next.content && 
    prev.selectedNote?.id === next.selectedNote?.id &&
    prev.isSignedIn === next.isSignedIn &&
    prev.notes.length === next.notes.length
);

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
        <div key={block.key} data-block-index={i} data-start-line={block.startLine} data-end-line={block.endLine} style={{ contain: 'layout paint style' }}>
          <MemoizedMarkdownBlock
            content={block.value}
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
