'use client';

interface NoteRegularEditorProps {
  editContent: string;
  setEditContent: (content: string) => void;
}

export const NoteRegularEditor: React.FC<NoteRegularEditorProps> = ({
  editContent,
  setEditContent
}) => {
  return (
    <div className="px-20 py-6 h-full">
      <textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        className="w-full h-full resize-none bg-transparent text-gray-300 focus:outline-none font-mono text-sm"
        placeholder="Write your note in Markdown..."
      />
    </div>
  );
};
