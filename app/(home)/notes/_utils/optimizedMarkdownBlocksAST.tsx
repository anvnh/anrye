import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { MemoizedMarkdown } from '../_utils';
import { Note } from '../_components/types';

// Parse markdown to AST and split into top-level blocks
export function splitMarkdownBlocksAST(content: string): { type: string; value: string; startLine: number; endLine: number }[] {
  const tree = unified().use(remarkParse).parse(content);
  const blocks: { type: string; value: string; startLine: number; endLine: number }[] = [];
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
      blocks.push({ type: node.type, value, startLine: node.position.start.line - 1, endLine: node.position.end.line - 1 });
      lastPos = node.position.end.offset;
    }
  });
  if (lastPos < content.length) {
    // Estimate line number for trailing content
    const prevBlock = blocks[blocks.length - 1];
    const prevEnd = prevBlock ? prevBlock.endLine + 1 : 0;
    const trailing = content.slice(lastPos);
    const trailingLen = trailing.split('\n').length - 1;
    blocks.push({ type: 'text', value: trailing, startLine: prevEnd, endLine: prevEnd + Math.max(0, trailingLen) });
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
    driveService
  }: {
    content: string;
    notes: Note[];
    selectedNote: Note | null;
    setEditContent: (content: string) => void;
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
    isSignedIn: boolean;
    driveService: any;
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
      />
    );
  },
  (prev, next) => prev.content === next.content && prev.selectedNote === next.selectedNote
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
}> = ({
  content,
  notes,
  selectedNote,
  setEditContent,
  setNotes,
  setSelectedNote,
  isSignedIn,
  driveService
}) => {
  const blocks = React.useMemo(() => splitMarkdownBlocksAST(content), [content]);
  return (
    <div>
      {blocks.map((block, i) => (
        <div key={i} data-block-index={i} data-start-line={block.startLine} data-end-line={block.endLine} style={{ contain: 'layout paint style' }}>
          <MemoizedMarkdownBlock
            content={block.value}
            notes={notes}
            selectedNote={selectedNote}
            setEditContent={setEditContent}
            setNotes={setNotes}
            setSelectedNote={setSelectedNote}
            isSignedIn={isSignedIn}
            driveService={driveService}
          />
        </div>
      ))}
    </div>
  );
};
