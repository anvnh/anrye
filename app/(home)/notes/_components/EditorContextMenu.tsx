'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  ContextMenu, 
  ContextMenuTrigger, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger 
} from '@/components/ui/context-menu';
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
  Quote
} from 'lucide-react';

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
      
      // Let the browser handle the default paste behavior
      // This ensures Firefox's native paste works properly
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
    <ContextMenu>
      <ContextMenuTrigger 
        asChild 
        onContextMenu={updateSelection}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-[#31363F] border-gray-600 text-gray-300">
        {/* Format submenu - only show if text is selected */}
        {selectedText && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                <Type className="mr-2 h-4 w-4" />
                Format
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300">
                <ContextMenuItem onClick={() => wrapText('**')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                  <Bold className="mr-2 h-4 w-4" />
                  Bold
                  <ContextMenuShortcut className="text-gray-400">Ctrl+B</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuItem onClick={() => wrapText('*')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                  <Italic className="mr-2 h-4 w-4" />
                  Italic
                  <ContextMenuShortcut className="text-gray-400">Ctrl+I</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuItem onClick={() => wrapText('~~')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                  <Strikethrough className="mr-2 h-4 w-4" />
                  Strikethrough
                  <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+X</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuItem onClick={() => wrapText('==')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                  <Highlighter className="mr-2 h-4 w-4" />
                  Highlight
                  <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+H</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuSeparator className="bg-gray-600" />
                
                <ContextMenuItem onClick={() => wrapText('`')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                  <Code className="mr-2 h-4 w-4" />
                  Code
                  <ContextMenuShortcut className="text-gray-400">Ctrl+E</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuItem onClick={() => wrapText('```\n', '\n```')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                  <Code className="mr-2 h-4 w-4" />
                  Code Block
                  <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+E</ContextMenuShortcut>
                </ContextMenuItem>
                
                <ContextMenuSeparator className="bg-gray-600" />
                
                <ContextMenuItem onClick={clearFormatting} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
                  <Eraser className="mr-2 h-4 w-4" />
                  Clear Formatting
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            
            <ContextMenuSeparator className="bg-gray-600" />
          </>
        )}

        {/* Paragraph submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
            <Hash className="mr-2 h-4 w-4" />
            Paragraph
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300">
            <ContextMenuItem onClick={() => insertHeading(1)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Heading1 className="mr-2 h-4 w-4" />
              Heading 1
              <ContextMenuShortcut className="text-gray-400">Ctrl+1</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertHeading(2)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Heading2 className="mr-2 h-4 w-4" />
              Heading 2
              <ContextMenuShortcut className="text-gray-400">Ctrl+2</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertHeading(3)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Heading3 className="mr-2 h-4 w-4" />
              Heading 3
              <ContextMenuShortcut className="text-gray-400">Ctrl+3</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertHeading(4)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Heading4 className="mr-2 h-4 w-4" />
              Heading 4
              <ContextMenuShortcut className="text-gray-400">Ctrl+4</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertHeading(5)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Heading5 className="mr-2 h-4 w-4" />
              Heading 5
              <ContextMenuShortcut className="text-gray-400">Ctrl+5</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertHeading(6)} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Heading6 className="mr-2 h-4 w-4" />
              Heading 6
              <ContextMenuShortcut className="text-gray-400">Ctrl+6</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuSeparator className="bg-gray-600" />
            
            <ContextMenuItem onClick={() => insertAtCursor('- ')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <List className="mr-2 h-4 w-4" />
              Bullet List
              <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+8</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertAtCursor('1. ')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <ListOrdered className="mr-2 h-4 w-4" />
              Numbered List
              <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+7</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertAtCursor('- [ ] ')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <CheckSquare className="mr-2 h-4 w-4" />
              Task List
              <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+9</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuSeparator className="bg-gray-600" />
            
            <ContextMenuItem onClick={() => insertAtCursor('> ')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Quote className="mr-2 h-4 w-4" />
              Quote
              <ContextMenuShortcut className="text-gray-400">Ctrl+Shift+.</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onClick={() => insertAtCursor('\n---\n')} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
              <Hash className="mr-2 h-4 w-4" />
              Horizontal Rule
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator className="bg-gray-600" />

        {/* Standard editing actions */}
        <ContextMenuItem onClick={() => {
          if (selectedText) {
            navigator.clipboard.writeText(selectedText);
          }
        }} disabled={!selectedText} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white disabled:text-gray-500">
          Copy
          <ContextMenuShortcut className="text-gray-400">Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => {
          if (selectedText) {
            navigator.clipboard.writeText(selectedText);
            const before = editContent.substring(0, selectionStart);
            const after = editContent.substring(selectionEnd);
            setEditContent(before + after);
          }
        }} disabled={!selectedText} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white disabled:text-gray-500">
          Cut
          <ContextMenuShortcut className="text-gray-400">Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
        
        <ContextMenuItem onClick={() => {
          // Focus the textarea first
          if (textareaRef?.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
            
            // Try clipboard API first
            navigator.clipboard.readText()
              .then(text => {
                const before = editContent.substring(0, selectionStart);
                const after = editContent.substring(selectionEnd);
                setEditContent(before + text + after);
                
                // Position cursor after pasted text
                setTimeout(() => {
                  if (textareaRef.current) {
                    const newPos = selectionStart + text.length;
                    textareaRef.current.setSelectionRange(newPos, newPos);
                  }
                }, 0);
              })
              .catch(() => {
                // Fallback: Let user use Ctrl+V manually
                // This works better with Firefox's security model
                console.log('Use Ctrl+V to paste, or allow clipboard access when prompted');
              });
          }
        }} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
          Paste
          <ContextMenuShortcut className="text-gray-400">Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-gray-600" />

        <ContextMenuItem onClick={() => {
          if (textareaRef?.current) {
            textareaRef.current.select();
          }
        }} className="text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white">
          Select All
          <ContextMenuShortcut className="text-gray-400">Ctrl+A</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
