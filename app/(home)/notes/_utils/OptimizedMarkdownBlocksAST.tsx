import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { MemoizedMarkdown } from '../_utils';
import { Note } from '../_components/types';

// Parse markdown to AST and split into top-level blocks
function splitMarkdownBlocksAST(content: string): { type: string; value: string }[] {
  const tree = unified().use(remarkParse).parse(content);
  const blocks: { type: string; value: string }[] = [];
  let lastPos = 0;
  // Each top-level node in AST is a block
  tree.children.forEach((node: any) => {
    // node.position.start.offset, node.position.end.offset
    if (node.position && typeof node.position.start.offset === 'number' && typeof node.position.end.offset === 'number') {
      const value = content.slice(node.position.start.offset, node.position.end.offset);
      blocks.push({ type: node.type, value });
      lastPos = node.position.end.offset;
    }
  });
  // If there is trailing content not captured (shouldn't happen), add as block
  if (lastPos < content.length) {
    blocks.push({ type: 'text', value: content.slice(lastPos) });
  }
  return blocks;
}

// Memoized block renderer with full MemoizedMarkdown features
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
  }) => (
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
  ),
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
        <MemoizedMarkdownBlock
          key={i}
          content={block.value}
          notes={notes}
          selectedNote={selectedNote}
          setEditContent={setEditContent}
          setNotes={setNotes}
          setSelectedNote={setSelectedNote}
          isSignedIn={isSignedIn}
          driveService={driveService}
        />
      ))}
    </div>
  );
};
