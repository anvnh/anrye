'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CMEditorApi } from '../core/CMEditor';
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
  Clipboard,
  Copy,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowUpFromLine,
  ArrowDownFromLine,
  CheckCircle2Icon
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

interface EditorToolbarProps {
  editContent: string;
  setEditContent: (content: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPasteImage?: () => void;
  cmApiRef?: React.RefObject<CMEditorApi | undefined>;
  isInTable?: boolean;
  onTableAction?: (action: string, direction?: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editContent,
  setEditContent,
  textareaRef,
  onPasteImage,
  cmApiRef,
  isInTable = false,
  onTableAction
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [widthDialogOpen, setWidthDialogOpen] = useState(false);
  const [widthInput, setWidthInput] = useState('');
  const [showCopyAlert, setShowCopyAlert] = useState(false);
  

  // Translate vertical wheel to horizontal scroll for the toolbar
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Prefer vertical delta for horizontal scroll, fallback to native horizontal delta
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;
      if (el.scrollWidth <= el.clientWidth) return; // no horizontal overflow

      const before = el.scrollLeft;
      el.scrollLeft += delta;
      if (el.scrollLeft !== before) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel as EventListener);
    };
  }, []);
  const updateSelection = useCallback(() => {
    // Prefer CodeMirror selection if available
    const api = cmApiRef?.current;
    if (api) {
      // We can't easily read selection text from API; fall back to no-op selection
      return { start: 0, end: 0, selected: '' };
    }
    if (textareaRef?.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      return { start, end, selected: editContent.substring(start, end) };
    }
    return { start: 0, end: 0, selected: '' };
  }, [editContent, textareaRef, cmApiRef]);

  const wrapText = useCallback((prefix: string, suffix: string = prefix) => {
    const api = cmApiRef?.current;
    if (api) {
      api.wrapSelection(prefix, suffix);
      return;
    }
    if (!textareaRef?.current) return;
    const { start, end, selected } = updateSelection();
    const before = editContent.substring(0, start);
    const after = editContent.substring(end);
    const isAlreadyWrapped = selected.startsWith(prefix) && selected.endsWith(suffix);
    const newContent = isAlreadyWrapped
      ? before + selected.substring(prefix.length, selected.length - suffix.length) + after
      : before + prefix + selected + suffix + after;
    setEditContent(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (isAlreadyWrapped) {
          const newStart = start;
          const newEnd = start + (selected.length - prefix.length - suffix.length);
          textareaRef.current.setSelectionRange(newStart, newEnd);
        } else {
          const newStart = start + prefix.length;
          const newEnd = newStart + selected.length;
          textareaRef.current.setSelectionRange(newStart, newEnd);
        }
      }
    }, 0);
  }, [editContent, setEditContent, textareaRef, updateSelection, cmApiRef]);

  const insertAtCursor = useCallback((text: string) => {
    const api = cmApiRef?.current;
    if (api) {
      api.insertTextAtSelection(text);
      return;
    }
    if (!textareaRef?.current) return;
    const { start, end } = updateSelection();
    const before = editContent.substring(0, start);
    const after = editContent.substring(end);
    const newContent = before + text + after;
    setEditContent(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = start + text.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [editContent, setEditContent, textareaRef, updateSelection, cmApiRef]);

  const insertHeading = useCallback((level: number) => {
    const api = cmApiRef?.current;
    if (api) {
      api.toggleHeadingAtLine(level);
      return;
    }
    if (!textareaRef?.current) return;
    const { start } = updateSelection();
    const before = editContent.substring(0, start);
    const after = editContent.substring(start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = after.indexOf('\n');
    const currentLine = editContent.substring(lineStart, lineEnd !== -1 ? start + lineEnd : editContent.length);
    const headingPrefix = '#'.repeat(level) + ' ';
    const isAlreadyHeading = currentLine.startsWith(headingPrefix);
    const newLine = isAlreadyHeading ? currentLine.substring(headingPrefix.length) : (currentLine.startsWith('#') ? headingPrefix + currentLine.replace(/^#+\s*/, '') : headingPrefix + currentLine);
    const newContent = editContent.substring(0, lineStart) + newLine + editContent.substring(lineEnd !== -1 ? start + lineEnd : editContent.length);
    setEditContent(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = lineStart + newLine.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [editContent, setEditContent, textareaRef, updateSelection, cmApiRef]);

  const handleUndo = useCallback(() => {
    const api = cmApiRef?.current;
    if (api) { api.undo(); return; }
    if (textareaRef?.current) {
      textareaRef.current.focus();
      document.execCommand('undo');
    }
  }, [textareaRef, cmApiRef]);

  const handleRedo = useCallback(() => {
    const api = cmApiRef?.current;
    if (api) { api.redo(); return; }
    if (textareaRef?.current) {
      textareaRef.current.focus();
      document.execCommand('redo');
    }
  }, [textareaRef, cmApiRef]);

  const handleCopyAllContent = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editContent);
      setShowCopyAlert(true);
      setTimeout(() => setShowCopyAlert(false), 2000);
    } catch (err) {
      console.error('Failed to copy content to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = editContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopyAlert(true);
      setTimeout(() => setShowCopyAlert(false), 2000);
    }
  }, [editContent]);

  // Helpers for table detection and manipulation
  const getDocHelpers = () => {
    const api = cmApiRef?.current;
    const getDoc = () => api ? api.getDocText() : (textareaRef?.current ? textareaRef.current.value : editContent);
    const setDoc = (text: string) => {
      if (api) { api.setDocText(text); api.focus(); return; }
      if (textareaRef?.current) { setEditContent(text); requestAnimationFrame(() => textareaRef.current?.focus()); return; }
      setEditContent(text);
    };
    const getCursor = () => {
      if (api) { const { from } = api.getSelectionOffsets(); return from; }
      if (textareaRef?.current) { return textareaRef.current.selectionStart; }
      return 0;
    };
    return { getDoc, setDoc, getCursor };
  };

  const findTableBounds = (text: string, cursor: number) => {
    const lines = text.split('\n');
    let char = 0, lineIdx = 0;
    for (let i = 0; i < lines.length; i++) { const len = lines[i].length + 1; if (char + len > cursor) { lineIdx = i; break; } char += len; }
    const isTableLine = (s: string) => /\|/.test(s) && !/^```/.test(s);
    let startLine = lineIdx;
    while (startLine > 0 && isTableLine(lines[startLine])) startLine--;
    if (!isTableLine(lines[startLine])) startLine++;
    let endLine = lineIdx;
    while (endLine < lines.length - 1 && isTableLine(lines[endLine])) endLine++;
    if (!isTableLine(lines[endLine])) endLine--;
    if (startLine > endLine) return null;
    return { lines, startLine, endLine };
  };

  const parseExistingWrapperVars = (openLine: string): Record<number, string> => {
    const map: Record<number, string> = {};
    const m = openLine.match(/style=\"([^\"]*)\"/);
    if (m) {
      const style = m[1];
      const re = /--col-(\d+)\s*:\s*([^;]+)\s*;?/g;
      let g: RegExpExecArray | null;
      while ((g = re.exec(style))) {
        map[Number(g[1])] = g[2];
      }
    }
    return map;
  };

  const normalizeValue = (raw: string) => {
    const v = raw.trim();
    if (!v) return '';
    if (/^\d+$/.test(v)) return `${v}px`;
    return v;
  };

  const parseWidthInput = (input: string): Record<number, string> => {
    const map: Record<number, string> = {};
    const parts = input.split(',');
    for (const p of parts) {
      const seg = p.trim();
      if (!seg) continue;
      let m = seg.match(/^(?:col\s*)?(\d+)\s*[:=]\s*(.+)$/i);
      if (!m) continue;
      const col = Number(m[1]);
      const val = normalizeValue(m[2]);
      if (col > 0 && val) map[col] = val;
    }
    return map;
  };

  const mergeStyleMap = (a: Record<number, string>, b: Record<number, string>): Record<number, string> => {
    const out: Record<number, string> = { ...a };
    for (const k of Object.keys(b)) out[Number(k)] = b[Number(k)];
    return out;
  };

  const styleMapToAttr = (map: Record<number, string>) => {
    const keys = Object.keys(map).map(n => Number(n)).sort((x, y) => x - y);
    return keys.map(k => `--col-${k}: ${map[k]}`).join('; ');
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 px-4 py-2 bg-main border-b border-gray-700 text-gray-300 overflow-x-auto overflow-y-hidden whitespace-nowrap w-full h-14 leading-none"
    >
      {/* Undo/Redo Group */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleUndo}
          className="p-2 leading-none hover:bg-gray-700 rounded transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={handleRedo}
          className="p-2 leading-none hover:bg-gray-700 rounded transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
      </div>
      
      <div className="w-px h-6 bg-gray-600 mx-2"></div>
      
      {/* Copy All Content */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleCopyAllContent}
          className="p-2 leading-none hover:bg-gray-700 rounded transition-colors"
          title="Copy all content to clipboard"
        >
          <Copy size={16} />
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
            const api = cmApiRef?.current;
            if (api) {
              // For CodeMirror, we need to implement bullet list logic manually
              const { from, to } = api.getSelectionOffsets();
              const docText = api.getDocText();
              const before = docText.substring(0, from);
              const after = docText.substring(to);
              
              // Find the start of the first line containing selection
              const lineStart = before.lastIndexOf('\n') + 1;
              
              // Find the end of the last line containing selection
              const lineEnd = after.indexOf('\n');
              const actualLineEnd = lineEnd !== -1 ? to + lineEnd : docText.length;
              
              // Get the complete lines that contain the selection
              const completeLines = docText.substring(lineStart, actualLineEnd);
              const lines = completeLines.split('\n');
              
              // Check if all lines are already bullet points
              const bulletPattern = /^(\s*)[-*+]\s/;
              const allAreBullets = lines.every(line => {
                // Skip empty lines when checking
                if (line.trim() === '') return true;
                return bulletPattern.test(line);
              });
              
              // Debug: log the lines and bullet check
              console.log('Bullet list debug:', {
                lines,
                allAreBullets,
                lineChecks: lines.map(line => ({
                  line: line.trim(),
                  isEmpty: line.trim() === '',
                  hasBullet: bulletPattern.test(line)
                }))
              });
              
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
              
              const newContent = docText.substring(0, lineStart) + newLines.join('\n') + docText.substring(actualLineEnd);
              api.setDocText(newContent);
              
              // Set selection to the modified lines
              const newEnd = lineStart + newLines.join('\n').length;
              api.setSelection(lineStart, newEnd);
              return;
            }
            
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
            const allAreBullets = lines.every(line => {
              // Skip empty lines when checking
              if (line.trim() === '') return true;
              return bulletPattern.test(line);
            });
            
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
          onClick={() => {
            const api = cmApiRef?.current;
            if (api) {
              // For CodeMirror, we need to implement numbered list logic manually
              const { from, to } = api.getSelectionOffsets();
              const docText = api.getDocText();
              const before = docText.substring(0, from);
              const after = docText.substring(to);
              
              // Find the start of the first line containing selection
              const lineStart = before.lastIndexOf('\n') + 1;
              
              // Find the end of the last line containing selection
              const lineEnd = after.indexOf('\n');
              const actualLineEnd = lineEnd !== -1 ? to + lineEnd : docText.length;
              
              // Get the complete lines that contain the selection
              const completeLines = docText.substring(lineStart, actualLineEnd);
              const lines = completeLines.split('\n');
              
              // Check if all lines are already numbered lists
              const numberedPattern = /^(\s*)\d+\.\s/;
              const allAreNumbered = lines.every(line => {
                // Skip empty lines when checking
                if (line.trim() === '') return true;
                return numberedPattern.test(line);
              });
              
              let newLines: string[];
              if (allAreNumbered) {
                // Remove numbered list formatting from all lines
                newLines = lines.map(line => {
                  const match = line.match(numberedPattern);
                  if (match) {
                    return line.substring(match[0].length);
                  }
                  return line;
                });
              } else {
                // Add numbered list formatting to all lines
                let counter = 1;
                newLines = lines.map(line => {
                  if (line.trim() === '') return line; // Skip empty lines
                  // Preserve leading whitespace for indentation, but ensure clean numbering
                  const match = line.match(/^(\s*)(.*)/);
                  const leadingWhitespace = match ? match[1] : '';
                  const content = match ? match[2] : line;
                  return `${leadingWhitespace}${counter++}. ${content}`;
                });
              }
              
              const newContent = docText.substring(0, lineStart) + newLines.join('\n') + docText.substring(actualLineEnd);
              api.setDocText(newContent);
              
              // Set selection to the modified lines
              const newEnd = lineStart + newLines.join('\n').length;
              api.setSelection(lineStart, newEnd);
              return;
            }
            
            if (!textareaRef?.current) return;
            
            const { start, end, selected } = updateSelection();
            
            // If no selection, just insert numbered item at cursor
            if (start === end) {
              insertAtCursor('1. ');
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
            
            // Check if all lines are already numbered lists
            const numberedPattern = /^(\s*)\d+\.\s/;
            const allAreNumbered = lines.every(line => {
              // Skip empty lines when checking
              if (line.trim() === '') return true;
              return numberedPattern.test(line);
            });
            
            let newLines: string[];
            if (allAreNumbered) {
              // Remove numbered list formatting from all lines
              newLines = lines.map(line => {
                const match = line.match(numberedPattern);
                if (match) {
                  return line.substring(match[0].length);
                }
                return line;
              });
            } else {
              // Add numbered list formatting to all lines
              let counter = 1;
              newLines = lines.map(line => {
                if (line.trim() === '') return line; // Skip empty lines
                // Preserve leading whitespace for indentation, but ensure clean numbering
                const match = line.match(/^(\s*)(.*)/);
                const leadingWhitespace = match ? match[1] : '';
                const content = match ? match[2] : line;
                return `${leadingWhitespace}${counter++}. ${content}`;
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
          onClick={() => {
            const template = '\n<div class="md-table" style="--col-1: 160px">\n\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n\n</div>\n';
            insertAtCursor(template);
          }}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Insert Table (wrapped)"
        >
          <Table size={16} />
        </button>
        <button
          onClick={() => {
            // Prefill from existing wrapper if present
            const { getDoc, getCursor } = getDocHelpers();
            const text = getDoc();
            const pos = getCursor();
            const tb = findTableBounds(text, pos);
            let prefill = '';
            if (tb) {
              const { lines, startLine, endLine } = tb;
              // look for wrapper open tag above
              let openIdx = startLine - 1;
              while (openIdx >= 0 && lines[openIdx].trim() === '') openIdx--;
              const hasOpen = openIdx >= 0 && /<div\s+class=["']md-table["']/.test(lines[openIdx]);
              if (hasOpen) {
                const map = parseExistingWrapperVars(lines[openIdx]);
                const parts = Object.keys(map).sort((a, b) => Number(a) - Number(b)).map(k => `col ${k}: ${map[Number(k)]}`);
                prefill = parts.join(', ');
              }
            }
            setWidthInput(prefill);
            setWidthDialogOpen(true);
          }}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="Set Table Column Widths"
        >
          <span className="inline-block text-xs font-semibold px-1">W</span>
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
      
      {/* Table Toolbar Section - Only show when in table */}
      {Boolean(isInTable) && (
        <>
          <div className="w-px h-6 bg-gray-600 mx-2"></div>
          
          {/* Column Section */}
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium mr-2 leading-none">Column</span>
            <button
              onClick={() => onTableAction && onTableAction('insertColumn', 'left')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Add column left"
            >
              <span className="inline-flex items-center gap-0.5">
                <ArrowLeftFromLine size={14} />
              </span>
            </button>
            <button
              onClick={() => onTableAction && onTableAction('insertColumn', 'right')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Add column right"
            >
              <span className="inline-flex items-center gap-0.5">
                <ArrowRightFromLine size={14} />
              </span>
            </button>
            <button
              onClick={() => onTableAction && onTableAction('deleteColumn')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Delete column"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => onTableAction && onTableAction('moveColumn', 'left')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Move column left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onTableAction && onTableAction('moveColumn', 'right')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Move column right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="w-px h-6 bg-gray-600 mx-2"></div>
          
          {/* Row Section */}
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium mr-2 leading-none">Row</span>
            <button
              onClick={() => onTableAction && onTableAction('insertRow', 'above')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Add row above"
            >
              <span className="inline-flex items-center gap-0.5">
                <ArrowUpFromLine size={14} />
              </span>
            </button>
            <button
              onClick={() => onTableAction && onTableAction('insertRow', 'below')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Add row below"
            >
              <span className="inline-flex items-center gap-0.5">
                <ArrowDownFromLine size={14} />
              </span>
            </button>
            <button
              onClick={() => onTableAction && onTableAction('deleteRow')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Delete row"
            >
              <Minus size={16} />
            </button>
          </div>
          
          <div className="w-px h-6 bg-gray-600 mx-2"></div>
          
          {/* Alignment Section */}
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium mr-2 leading-none">Alignment</span>
            <button
              onClick={() => onTableAction && onTableAction('align', 'left')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Align left"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => onTableAction && onTableAction('align', 'center')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Align center"
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => onTableAction && onTableAction('align', 'right')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Align right"
            >
              <AlignRight size={16} />
            </button>
            <button
              onClick={() => onTableAction && onTableAction('align', 'none')}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Clear alignment"
            >
              <X size={16} />
            </button>
          </div>
        </>
      )}
      {/* Width Dialog */}
      <AlertDialog open={widthDialogOpen} onOpenChange={setWidthDialogOpen}>
        <AlertDialogContent className="bg-main border-gray-700 text-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Set table column widths</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Ví dụ: <code>col 2: 300px, col 5: 200px</code>. Chỉ các cột bạn nêu mới áp dụng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Input
              value={widthInput}
              onChange={(e) => setWidthInput(e.target.value)}
              placeholder="col 2: 300px, col 5: 200px"
              className="bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-400"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setWidthDialogOpen(false)}
              className="!bg-gray-700 !hover:bg-gray-600 !text-gray-200 !border-gray-600 !hover:border-gray-500"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const specMap = parseWidthInput(widthInput);
                const { getDoc, setDoc, getCursor } = getDocHelpers();
                const text = getDoc();
                const pos = getCursor();
                const tb = findTableBounds(text, pos);
                if (!tb) {
                  // no table, insert simple wrapped table with vars
                  const style = styleMapToAttr(specMap);
                  const template = `\n<div class=\"md-table\"${style ? ` style=\"${style}\"` : ''}>\n\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n\n</div>\n`;
                  const before = text.slice(0, pos);
                  const after = text.slice(pos);
                  setDoc(before + template + after);
                  setWidthDialogOpen(false);
                  return;
                }
                const { lines, startLine, endLine } = tb;
                // Detect wrapper
                let openIdx = startLine - 1;
                while (openIdx >= 0 && lines[openIdx].trim() === '') openIdx--;
                const hasOpen = openIdx >= 0 && /<div\s+class=["']md-table["']/.test(lines[openIdx]);
                let closeIdx = endLine + 1;
                while (closeIdx < lines.length && lines[closeIdx].trim() === '') closeIdx++;
                const hasClose = closeIdx < lines.length && /<\/div>/.test(lines[closeIdx]);

                if (hasOpen && hasClose) {
                  const existing = parseExistingWrapperVars(lines[openIdx]);
                  const merged = mergeStyleMap(existing, specMap);
                  const style = styleMapToAttr(merged);
                  if (/style=/.test(lines[openIdx])) {
                    lines[openIdx] = lines[openIdx].replace(/style=\"[^\"]*\"/, `style=\"${style}\"`);
                  } else {
                    lines[openIdx] = lines[openIdx].replace(/>\s*$/, ` style=\"${style}\">`);
                  }
                } else {
                  // Inject wrapper with style and blank lines
                  const style = styleMapToAttr(specMap);
                  const open = `<div class=\"md-table\"${style ? ` style=\"${style}\"` : ''}>`;
                  const close = `</div>`;
                  lines.splice(startLine, 0, open);
                  lines.splice(startLine + 1, 0, '');
                  const shiftedEnd = endLine + 2;
                  lines.splice(shiftedEnd + 1, 0, '');
                  lines.splice(shiftedEnd + 2, 0, close);
                }
                setDoc(lines.join('\n'));
                setWidthDialogOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
            >
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Notification (render in portal to avoid transform/overflow issues) */}
      {showCopyAlert && typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
          <Alert variant="default" className="alert-custom w-80 pointer-events-auto bg-sidebar">
            <CheckCircle2Icon className="h-5 w-5" />
            <AlertTitle>Content copied!</AlertTitle>
            <AlertDescription>
              All note content has been copied to your clipboard.
            </AlertDescription>
          </Alert>
        </div>,
        document.body
      )}
    </div>
  );
}; 