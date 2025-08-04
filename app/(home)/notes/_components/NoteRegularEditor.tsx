'use client';

import { useRef } from 'react';
import { EditorContextMenu } from './EditorContextMenu';


interface NoteRegularEditorProps {
  editContent: string;
  setEditContent: (content: string) => void;
  tabSize?: number;
}

export const NoteRegularEditor: React.FC<NoteRegularEditorProps> = ({
  editContent,
  setEditContent,
  tabSize = 2
}) => {
  // Handle Tab key, auto bracket/quote, auto bullet, etc.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = ' '.repeat(tabSize);
      setEditContent(value.slice(0, start) + indent + value.slice(end));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
      return;
    }
    // Auto close brackets/quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`',
    };
    if (Object.keys(pairs).includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const close = pairs[e.key];
      setEditContent(value.slice(0, start) + e.key + close + value.slice(end));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
      return;
    }
    // Auto continue bullet/checkbox list
    if (e.key === 'Enter') {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.slice(lineStart);
      // Continue checkbox: always insert '- [ ] '
      const checkboxMatch = currentLine.match(/^(\s*)- \[[ xX]?\] /);
      if (checkboxMatch) {
        e.preventDefault();
        const prefix = checkboxMatch[1] + '- [ ] ';
        setEditContent(value.slice(0, start) + '\n' + prefix + value.slice(end));
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
        return;
      }
      // Bullet: - , * , + , numbered list
      const bulletMatch = currentLine.match(/^(\s*)([-*+] |\d+\. )/);
      if (bulletMatch) {
        e.preventDefault();
        const prefix = bulletMatch[1] + (bulletMatch[2].match(/\d+\./) ? (parseInt(bulletMatch[2]) + 1) + '. ' : bulletMatch[2]);
        setEditContent(
          value.slice(0, start) + '\n' + prefix + value.slice(end)
        );
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
        return;
      }
    }
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  return (
    <div className="px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-6 h-full bg-secondary">
      <EditorContextMenu 
        editContent={editContent} 
        setEditContent={setEditContent}
        textareaRef={textareaRef}
      >
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-full resize-none bg-secondary text-gray-300 focus:outline-none font-mono text-sm"
          placeholder="Write your note in Markdown..."
          style={{ backgroundColor: '#111111' }}
        />
      </EditorContextMenu>
    </div>
  );
};
