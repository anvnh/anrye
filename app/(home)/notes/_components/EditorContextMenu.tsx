'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Highlighter, 
  Code, 
  Hash, 
  MessageCircle,
  Eraser,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Type,
  Quote,
  ChevronRight
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';

interface EditorContextMenuProps {
  children: React.ReactNode;
  editContent: string;
  setEditContent: (content: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  children,
  editContent,
  setEditContent,
  textareaRef
}) => {
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const updateSelection = useCallback(() => {
    if (textareaRef?.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = editContent.substring(start, end);
      
      setSelectedText(selected);
      setSelectionStart(start);
      setSelectionEnd(end);
    }
  }, [editContent, textareaRef]);

  const wrapText = useCallback((prefix: string, suffix: string = prefix) => {
    if (!textareaRef?.current) return;
    
    updateSelection();
    
    const before = editContent.substring(0, selectionStart);
    const selected = editContent.substring(selectionStart, selectionEnd);
    const after = editContent.substring(selectionEnd);
    
    const newContent = before + prefix + selected + suffix + after;
    setEditContent(newContent);
    
    // Restore focus and selection
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newStart = selectionStart + prefix.length;
        const newEnd = newStart + selected.length;
        textareaRef.current.setSelectionRange(newStart, newEnd);
      }
    }, 0);
  }, [editContent, selectionStart, selectionEnd, setEditContent, textareaRef, updateSelection]);

  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef?.current) return;
    
    updateSelection();
    
    const before = editContent.substring(0, selectionStart);
    const after = editContent.substring(selectionEnd);
    
    const newContent = before + text + after;
    setEditContent(newContent);
    
    // Restore focus and position cursor after inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = selectionStart + text.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [editContent, selectionStart, selectionEnd, setEditContent, textareaRef, updateSelection]);

  const insertHeading = useCallback((level: number) => {
    updateSelection();
    
    const lines = editContent.split('\n');
    const startLine = editContent.substring(0, selectionStart).split('\n').length - 1;
    
    const prefix = '#'.repeat(level) + ' ';
    
    // If line already has heading, replace it
    if (lines[startLine] && lines[startLine].match(/^#{1,6}\s/)) {
      lines[startLine] = lines[startLine].replace(/^#{1,6}\s/, prefix);
    } else {
      lines[startLine] = prefix + (lines[startLine] || '');
    }
    
    setEditContent(lines.join('\n'));
    
    setTimeout(() => {
      if (textareaRef?.current) {
        textareaRef.current.focus();
      }
    }, 0);
  }, [editContent, selectionStart, setEditContent, textareaRef, updateSelection]);

  const clearFormatting = useCallback(() => {
    if (!selectedText) return;
    
    // Remove common markdown formatting
    let cleaned = selectedText
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic  
      .replace(/~~(.*?)~~/g, '$1')     // Strikethrough
      .replace(/==(.*?)==/g, '$1')     // Highlight
      .replace(/`(.*?)`/g, '$1')       // Code
      .replace(/^#{1,6}\s+/gm, '');    // Headings
    
    const before = editContent.substring(0, selectionStart);
    const after = editContent.substring(selectionEnd);
    
    const newContent = before + cleaned + after;
    setEditContent(newContent);
    
    setTimeout(() => {
      if (textareaRef?.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(selectionStart, selectionStart + cleaned.length);
      }
    }, 0);
  }, [selectedText, editContent, selectionStart, selectionEnd, setEditContent, textareaRef]);

  const handleCopy = useCallback(() => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
    }
  }, [selectedText]);

  const handleCut = useCallback(() => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      const before = editContent.substring(0, selectionStart);
      const after = editContent.substring(selectionEnd);
      setEditContent(before + after);
    }
  }, [selectedText, editContent, selectionStart, selectionEnd, setEditContent]);

  const handlePaste = useCallback(() => {
    if (textareaRef?.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
      
      navigator.clipboard.readText()
        .then(text => {
          const before = editContent.substring(0, selectionStart);
          const after = editContent.substring(selectionEnd);
          setEditContent(before + text + after);
          
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = selectionStart + text.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        })
        .catch(() => {
          // Handle clipboard read error
        });
    }
  }, [editContent, selectionStart, selectionEnd, setEditContent, textareaRef]);

  const handleSelectAll = useCallback(() => {
    if (textareaRef?.current) {
      textareaRef.current.select();
    }
  }, [textareaRef]);

  // Keyboard shortcuts for formatting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef?.current || textareaRef.current !== document.activeElement) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            wrapText('**');
            break;
          case 'i':
            e.preventDefault();
            wrapText('*');
            break;
          case 'e':
            e.preventDefault();
            wrapText('`');
            break;
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
            e.preventDefault();
            insertHeading(parseInt(e.key));
            break;
          default:
            if (e.shiftKey) {
              switch (e.key) {
                case 'X':
                  e.preventDefault();
                  wrapText('~~');
                  break;
                case 'H':
                  e.preventDefault();
                  wrapText('==');
                  break;
                case 'E':
                  e.preventDefault();
                  wrapText('```\n', '\n```');
                  break;
                case '*':
                  e.preventDefault();
                  insertAtCursor('- ');
                  break;
                case '&':
                  e.preventDefault();
                  insertAtCursor('1. ');
                  break;
                case '(':
                  e.preventDefault();
                  insertAtCursor('- [ ] ');
                  break;
                case '>':
                  e.preventDefault();
                  insertAtCursor('> ');
                  break;
              }
            }
            break;
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!textareaRef?.current || textareaRef.current !== document.activeElement) return;
      e.stopPropagation();
    };

    document.addEventListener('keydown', handleKeyDown);
    if (textareaRef?.current) {
      textareaRef.current.addEventListener('paste', handlePaste);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (textareaRef?.current) {
        textareaRef.current.removeEventListener('paste', handlePaste);
      }
    };
  }, [wrapText, insertHeading, insertAtCursor, textareaRef]);

  return (
    <ContextMenu onOpenChange={() => updateSelection()}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-secondary text-gray-300 border-gray-600">
        {selectedText && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Type className="mr-2 h-4 w-4" />
                <span>Format</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className='bg-secondary text-gray-300 border-gray-600'>
                <ContextMenuItem onClick={() => wrapText('**')}>
                  <Bold className="mr-2 h-4 w-4" />
                  <span>Bold</span>
                  <ContextMenuShortcut>Ctrl+B</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => wrapText('*')}>
                  <Italic className="mr-2 h-4 w-4" />
                  <span>Italic</span>
                  <ContextMenuShortcut>Ctrl+I</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => wrapText('~~')}>
                  <Strikethrough className="mr-2 h-4 w-4" />
                  <span>Strikethrough</span>
                  <ContextMenuShortcut>Ctrl+Shift+X</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => wrapText('==')}>
                  <Highlighter className="mr-2 h-4 w-4" />
                  <span>Highlight</span>
                  <ContextMenuShortcut>Ctrl+Shift+H</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => wrapText('`')}>
                  <Code className="mr-2 h-4 w-4" />
                  <span>Code</span>
                  <ContextMenuShortcut>Ctrl+E</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={() => wrapText('```\n', '\n```')}>
                  <Code className="mr-2 h-4 w-4" />
                  <span>Code Block</span>
                  <ContextMenuShortcut>Ctrl+Shift+E</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={clearFormatting}>
                  <Eraser className="mr-2 h-4 w-4" />
                  <span>Clear Formatting</span>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}

        {/* Paragraph submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Hash className="mr-2 h-4 w-4" />
            <span>Paragraph</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className='bg-secondary text-gray-300 border-gray-600'>
            <ContextMenuItem onClick={() => insertHeading(1)}>
              <Heading1 className="mr-2 h-4 w-4" />
              <span>Heading 1</span>
              <ContextMenuShortcut>Ctrl+1</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertHeading(2)}>
              <Heading2 className="mr-2 h-4 w-4" />
              <span>Heading 2</span>
              <ContextMenuShortcut>Ctrl+2</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertHeading(3)}>
              <Heading3 className="mr-2 h-4 w-4" />
              <span>Heading 3</span>
              <ContextMenuShortcut>Ctrl+3</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertHeading(4)}>
              <Heading4 className="mr-2 h-4 w-4" />
              <span>Heading 4</span>
              <ContextMenuShortcut>Ctrl+4</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertHeading(5)}>
              <Heading5 className="mr-2 h-4 w-4" />
              <span>Heading 5</span>
              <ContextMenuShortcut>Ctrl+5</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertHeading(6)}>
              <Heading6 className="mr-2 h-4 w-4" />
              <span>Heading 6</span>
              <ContextMenuShortcut>Ctrl+6</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => insertAtCursor('- ')}>
              <List className="mr-2 h-4 w-4" />
              <span>Bullet List</span>
              <ContextMenuShortcut>Ctrl+Shift+*</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertAtCursor('1. ')}>
              <ListOrdered className="mr-2 h-4 w-4" />
              <span>Numbered List</span>
              <ContextMenuShortcut>Ctrl+Shift+&</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertAtCursor('- [ ] ')}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Task List</span>
              <ContextMenuShortcut>Ctrl+Shift+(</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => insertAtCursor('> ')}>
              <Quote className="mr-2 h-4 w-4" />
              <span>Quote</span>
              <ContextMenuShortcut>Ctrl+Shift+&gt;</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => insertAtCursor('\n---\n')}>
              <Hash className="mr-2 h-4 w-4" />
              <span>Horizontal Rule</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator className='bg-[#4a5565]'/>

        {/* Standard editing actions */}
        <ContextMenuItem onClick={handleCopy} disabled={!selectedText}>
          <span>Copy</span>
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCut} disabled={!selectedText}>
          <span>Cut</span>
          <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste}>
          <span>Paste</span>
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleSelectAll}>
          <span>Select All</span>
          <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
