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
  // Handle Tab key for indentation
  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const indent = ' '.repeat(tabSize);
      setEditContent(value.slice(0, start) + indent + value.slice(end));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
    }
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  return (
    <div className="px-20 py-6 h-full bg-secondary">
      <EditorContextMenu 
        editContent={editContent} 
        setEditContent={setEditContent}
        textareaRef={textareaRef}
      >
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleTabKey}
          className="w-full h-full resize-none bg-secondary text-gray-300 focus:outline-none font-mono text-sm"
          placeholder="Write your note in Markdown..."
          style={{ backgroundColor: '#111111' }}
        />
      </EditorContextMenu>
    </div>
  );
};
