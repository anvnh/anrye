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

interface EditorContextMenuProps {
  children: React.ReactNode;
  editContent: string;
  setEditContent: (content: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  children?: MenuItem[];
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
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    updateSelection();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
    setActiveSubmenu(null);
  }, [updateSelection]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setContextMenuVisible(false);
      setActiveSubmenu(null);
    }
  }, []);

  useEffect(() => {
    if (contextMenuVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuVisible, handleClickOutside]);

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

  const menuItems: MenuItem[] = [
    // Format submenu - only show if text is selected
         ...(selectedText ? [{
       id: 'format',
       label: 'Format',
       icon: <Type className="mr-2 h-4 w-4" />,
       onClick: () => {},
       children: [
        {
          id: 'bold',
          label: 'Bold',
          icon: <Bold className="mr-2 h-4 w-4" />,
          onClick: () => wrapText('**')
        },
        {
          id: 'italic',
          label: 'Italic',
          icon: <Italic className="mr-2 h-4 w-4" />,
          onClick: () => wrapText('*')
        },
        {
          id: 'strikethrough',
          label: 'Strikethrough',
          icon: <Strikethrough className="mr-2 h-4 w-4" />,
          onClick: () => wrapText('~~')
        },
        {
          id: 'highlight',
          label: 'Highlight',
          icon: <Highlighter className="mr-2 h-4 w-4" />,
          onClick: () => wrapText('==')
        },
        { id: 'separator1', label: '', onClick: () => {} },
        {
          id: 'code',
          label: 'Code',
          icon: <Code className="mr-2 h-4 w-4" />,
          onClick: () => wrapText('`')
        },
        {
          id: 'codeBlock',
          label: 'Code Block',
          icon: <Code className="mr-2 h-4 w-4" />,
          onClick: () => wrapText('```\n', '\n```')
        },
        { id: 'separator2', label: '', onClick: () => {} },
        {
          id: 'clearFormatting',
          label: 'Clear Formatting',
          icon: <Eraser className="mr-2 h-4 w-4" />,
          onClick: clearFormatting
        }
      ]
    }] : []),
    
         // Paragraph submenu
     {
       id: 'paragraph',
       label: 'Paragraph',
       icon: <Hash className="mr-2 h-4 w-4" />,
       onClick: () => {},
       children: [
        {
          id: 'h1',
          label: 'Heading 1',
          icon: <Heading1 className="mr-2 h-4 w-4" />,
          onClick: () => insertHeading(1)
        },
        {
          id: 'h2',
          label: 'Heading 2',
          icon: <Heading2 className="mr-2 h-4 w-4" />,
          onClick: () => insertHeading(2)
        },
        {
          id: 'h3',
          label: 'Heading 3',
          icon: <Heading3 className="mr-2 h-4 w-4" />,
          onClick: () => insertHeading(3)
        },
        {
          id: 'h4',
          label: 'Heading 4',
          icon: <Heading4 className="mr-2 h-4 w-4" />,
          onClick: () => insertHeading(4)
        },
        {
          id: 'h5',
          label: 'Heading 5',
          icon: <Heading5 className="mr-2 h-4 w-4" />,
          onClick: () => insertHeading(5)
        },
        {
          id: 'h6',
          label: 'Heading 6',
          icon: <Heading6 className="mr-2 h-4 w-4" />,
          onClick: () => insertHeading(6)
        },
        { id: 'separator3', label: '', onClick: () => {} },
        {
          id: 'bulletList',
          label: 'Bullet List',
          icon: <List className="mr-2 h-4 w-4" />,
          onClick: () => insertAtCursor('- ')
        },
        {
          id: 'numberedList',
          label: 'Numbered List',
          icon: <ListOrdered className="mr-2 h-4 w-4" />,
          onClick: () => insertAtCursor('1. ')
        },
        {
          id: 'taskList',
          label: 'Task List',
          icon: <CheckSquare className="mr-2 h-4 w-4" />,
          onClick: () => insertAtCursor('- [ ] ')
        },
        { id: 'separator4', label: '', onClick: () => {} },
        {
          id: 'quote',
          label: 'Quote',
          icon: <Quote className="mr-2 h-4 w-4" />,
          onClick: () => insertAtCursor('> ')
        },
        {
          id: 'horizontalRule',
          label: 'Horizontal Rule',
          icon: <Hash className="mr-2 h-4 w-4" />,
          onClick: () => insertAtCursor('\n---\n')
        }
      ]
    },
    
    { id: 'separator5', label: '', onClick: () => {} },
    
    // Standard editing actions
    {
      id: 'copy',
      label: 'Copy',
      disabled: !selectedText,
      onClick: () => {
        if (selectedText) {
          navigator.clipboard.writeText(selectedText);
        }
      }
    },
    {
      id: 'cut',
      label: 'Cut',
      disabled: !selectedText,
      onClick: () => {
        if (selectedText) {
          navigator.clipboard.writeText(selectedText);
          const before = editContent.substring(0, selectionStart);
          const after = editContent.substring(selectionEnd);
          setEditContent(before + after);
        }
      }
    },
    {
      id: 'paste',
      label: 'Paste',
      onClick: () => {
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
  
            });
        }
      }
    },
    
    { id: 'separator6', label: '', onClick: () => {} },
    
    {
      id: 'selectAll',
      label: 'Select All',
      onClick: () => {
        if (textareaRef?.current) {
          textareaRef.current.select();
        }
      }
    }
  ];

  const renderMenuItem = (item: MenuItem) => {
    if (item.id.startsWith('separator')) {
      return <div key={item.id} className="h-px bg-gray-600 my-1" />;
    }

    return (
      <div
        key={item.id}
        className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-700 hover:text-white ${
          item.disabled ? 'text-gray-500 cursor-not-allowed' : 'text-gray-300'
        }`}
        onClick={() => {
          if (!item.disabled && item.onClick) {
            item.onClick();
            setContextMenuVisible(false);
            setActiveSubmenu(null);
          }
        }}
        onMouseEnter={() => {
          if (item.children) {
            setActiveSubmenu(item.id);
          }
        }}
      >
        <div className="flex items-center">
          {item.icon}
          <span>{item.label}</span>
        </div>
        <div className="flex items-center">
          {item.shortcut && (
            <span className="text-xs text-gray-400 ml-4">{item.shortcut}</span>
          )}
          {item.children && (
            <ChevronRight className="ml-2 h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
    );
  };

  const renderSubmenu = (item: MenuItem) => {
    if (!item.children) return null;

    return (
      <div
        key={`submenu-${item.id}`}
        className={`absolute left-full top-0 w-48 bg-[#31363F] border border-gray-600 rounded-md shadow-lg z-50 ${
          activeSubmenu === item.id ? 'block' : 'hidden'
        }`}
      >
        {item.children.map(renderMenuItem)}
      </div>
    );
  };

  return (
    <>
      <div onContextMenu={handleContextMenu} className="w-full h-full">
        {children}
      </div>
      
      {contextMenuVisible && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-64 bg-[#31363F] border border-gray-600 rounded-md shadow-lg"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <div className="relative">
            {menuItems.map(renderMenuItem)}
            {menuItems.map(renderSubmenu)}
          </div>
        </div>
      )}
    </>
  );
};
