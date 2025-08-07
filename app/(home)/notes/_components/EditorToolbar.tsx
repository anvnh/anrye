'use client';

import { useCallback, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Code, 
  Quote, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Link, 
  Image, 
  Table, 
  Minus, 
  MessageCircle,
  Undo,
  Redo,
  Clipboard
} from 'lucide-react';

interface EditorToolbarProps {
  editContent: string;
  setEditContent: (content: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPasteImage?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editContent,
  setEditContent,
  textareaRef,
  onPasteImage
}) => {
  const updateSelection = useCallback(() => {
    if (textareaRef?.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      return { start, end, selected: editContent.substring(start, end) };
    }
    return { start: 0, end: 0, selected: '' };
  }, [editContent, textareaRef]);

  const wrapText = useCallback((prefix: string, suffix: string = prefix) => {
    if (!textareaRef?.current) return;
    
    const { start, end, selected } = updateSelection();
    
    const before = editContent.substring(0, start);
    const after = editContent.substring(end);
    
    // Check if the selected text is already wrapped with the same prefix/suffix
    const isAlreadyWrapped = selected.startsWith(prefix) && selected.endsWith(suffix);
    
    let newContent: string;
    if (isAlreadyWrapped) {
      // Remove the formatting
      const unwrappedText = selected.substring(prefix.length, selected.length - suffix.length);
      newContent = before + unwrappedText + after;
    } else {
      // Add the formatting
      newContent = before + prefix + selected + suffix + after;
    }
    
    setEditContent(newContent);
    
    // Restore focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (isAlreadyWrapped) {
          // Selection should be the unwrapped text
          const newStart = start;
          const newEnd = start + (selected.length - prefix.length - suffix.length);
          textareaRef.current.setSelectionRange(newStart, newEnd);
        } else {
          // Selection should be the wrapped text
          const newStart = start + prefix.length;
          const newEnd = newStart + selected.length;
          textareaRef.current.setSelectionRange(newStart, newEnd);
        }
      }
    }, 0);
  }, [editContent, setEditContent, textareaRef, updateSelection]);

  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef?.current) return;
    
    const { start, end } = updateSelection();
    
    const before = editContent.substring(0, start);
    const after = editContent.substring(end);
    
    const newContent = before + text + after;
    setEditContent(newContent);
    
    // Restore focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + text.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [editContent, setEditContent, textareaRef, updateSelection]);

  const insertHeading = useCallback((level: number) => {
    if (!textareaRef?.current) return;
    
    const { start } = updateSelection();
    
    // Find the start of the current line
    const before = editContent.substring(0, start);
    const after = editContent.substring(start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = after.indexOf('\n');
    const currentLine = editContent.substring(lineStart, lineEnd !== -1 ? start + lineEnd : editContent.length);
    
    const headingPrefix = '#'.repeat(level) + ' ';
    
    // Check if the line already has the same heading level
    const isAlreadyHeading = currentLine.startsWith(headingPrefix);
    
    let newLine: string;
    if (isAlreadyHeading) {
      // Remove the heading formatting
      newLine = currentLine.substring(headingPrefix.length);
    } else {
      // Add the heading formatting
      newLine = currentLine.startsWith('#') ? headingPrefix + currentLine.replace(/^#+\s*/, '') : headingPrefix + currentLine;
    }
    
    const newContent = editContent.substring(0, lineStart) + newLine + editContent.substring(lineEnd !== -1 ? start + lineEnd : editContent.length);
    setEditContent(newContent);
    
    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = lineStart + newLine.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [editContent, setEditContent, textareaRef, updateSelection]);

  const handleUndo = useCallback(() => {
    if (textareaRef?.current) {
      textareaRef.current.focus();
      document.execCommand('undo');
    }
  }, [textareaRef]);

  const handleRedo = useCallback(() => {
    if (textareaRef?.current) {
      textareaRef.current.focus();
      document.execCommand('redo');
    }
  }, [textareaRef]);

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-main border-b border-gray-700 text-gray-300">
      {/* Undo/Redo Group */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleUndo}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={handleRedo}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
      </div>
      
      <div className="w-px h-6 bg-gray-600 mx-2"></div>
      
      {/* Text Formatting Group */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => wrapText('**')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => wrapText('*')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => wrapText('~~')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Strikethrough (Ctrl+Shift+X)"
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => insertHeading(1)}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Heading 1 (Ctrl+1)"
        >
          <Heading1 size={16} />
        </button>
      </div>
      
      <div className="w-px h-6 bg-gray-600 mx-2"></div>
      
      {/* Content Type Group */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            if (!textareaRef?.current) return;
            
            const { start, end, selected } = updateSelection();
            
            const before = editContent.substring(0, start);
            const after = editContent.substring(end);
            
            // Check if the selected text is already wrapped in a code block
            const isAlreadyCodeBlock = selected.startsWith('```\n') && selected.endsWith('\n```');
            
            let newContent: string;
            if (isAlreadyCodeBlock) {
              // Remove the code block formatting
              const unwrappedText = selected.substring(4, selected.length - 4); // Remove ```\n and \n```
              newContent = before + unwrappedText + after;
            } else {
              // Add the code block formatting
              newContent = before + '```\n' + selected + '\n```' + after;
            }
            
            setEditContent(newContent);
            
            // Restore focus and selection
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.focus();
                if (isAlreadyCodeBlock) {
                  // Selection should be the unwrapped text
                  const newStart = start;
                  const newEnd = start + (selected.length - 8); // Remove ```\n and \n```
                  textareaRef.current.setSelectionRange(newStart, newEnd);
                } else {
                  // Selection should be the wrapped text
                  const newStart = start + 4; // After ```\n
                  const newEnd = newStart + selected.length;
                  textareaRef.current.setSelectionRange(newStart, newEnd);
                }
              }
            }, 0);
          }}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Code Block (Ctrl+Shift+E)"
        >
          <Code size={16} />
        </button>
        <button
          onClick={() => insertAtCursor('> ')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Quote (Ctrl+Shift+>)"
        >
          <Quote size={16} />
        </button>
        <button
          onClick={() => {
            if (!textareaRef?.current) return;
            
            const { start, end, selected } = updateSelection();
            
            // If no selection, just insert bullet at cursor
            if (start === end) {
              insertAtCursor('- ');
              return;
            }
            
            // Find the start and end of the lines that contain the selection
            const before = editContent.substring(0, start);
            const after = editContent.substring(end);
            
            // Find the start of the first line containing selection
            const lineStart = before.lastIndexOf('\n') + 1;
            
            // Find the end of the last line containing selection
            const lineEnd = after.indexOf('\n');
            const actualLineEnd = lineEnd !== -1 ? end + lineEnd : editContent.length;
            
            // Get the complete lines that contain the selection
            const completeLines = editContent.substring(lineStart, actualLineEnd);
            const lines = completeLines.split('\n');
            
            // Check if all lines are already bullet points
            const bulletPattern = /^(\s*)[-*+]\s/;
            const allAreBullets = lines.every(line => bulletPattern.test(line));
            
            let newLines: string[];
            if (allAreBullets) {
              // Remove bullet points from all lines
              newLines = lines.map(line => {
                const match = line.match(bulletPattern);
                if (match) {
                  return line.substring(match[0].length);
                }
                return line;
              });
            } else {
              // Add bullet points to all lines
              newLines = lines.map(line => {
                if (line.trim() === '') return line; // Skip empty lines
                return '- ' + line;
              });
            }
            
            const newContent = editContent.substring(0, lineStart) + newLines.join('\n') + editContent.substring(actualLineEnd);
            setEditContent(newContent);
            
            // Restore focus and selection
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.focus();
                const newEnd = lineStart + newLines.join('\n').length;
                textareaRef.current.setSelectionRange(lineStart, newEnd);
              }
            }, 0);
          }}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Bullet List (Ctrl+Shift+*)"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => insertAtCursor('1. ')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Numbered List (Ctrl+Shift+&)"
        >
          <ListOrdered size={16} />
        </button>
        <button
          onClick={() => insertAtCursor('- [ ] ')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Task List (Ctrl+Shift+()"
        >
          <CheckSquare size={16} />
        </button>
      </div>
      
      <div className="w-px h-6 bg-gray-600 mx-2"></div>
      
      {/* Media/Insertion Group */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => insertAtCursor('[link text](url)')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Insert Link"
        >
          <Link size={16} />
        </button>
        <button
          onClick={() => insertAtCursor('![alt text](image-url)')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Insert Image"
        >
          <Image size={16} />
        </button>
        <button
          onClick={onPasteImage}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Paste Image (Ctrl+V)"
        >
          <Clipboard size={16} />
        </button>
        <button
          onClick={() => insertAtCursor('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Insert Table"
        >
          <Table size={16} />
        </button>
        <button
          onClick={() => insertAtCursor('\n---\n')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Horizontal Rule"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => insertAtCursor('<!-- comment -->')}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Insert Comment"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
}; 