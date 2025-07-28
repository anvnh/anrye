'use client';

import { useRef } from 'react';
import { EditorContextMenu } from './EditorContextMenu';

interface NoteRegularEditorProps {
  editContent: string;
  setEditContent: (content: string) => void;
}

export const NoteRegularEditor: React.FC<NoteRegularEditorProps> = ({
  editContent,
  setEditContent
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  return (
    <div className="px-20 py-6 h-full" style={{ backgroundColor: '#111111' }}>
      <EditorContextMenu 
        editContent={editContent} 
        setEditContent={setEditContent}
        textareaRef={textareaRef}
      >
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-full resize-none bg-transparent text-gray-300 focus:outline-none font-mono text-sm"
          placeholder="Write your note in Markdown..."
          style={{ backgroundColor: '#111111' }}
        />
      </EditorContextMenu>
    </div>
  );
};
