'use client';

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Note } from '../_components/types';
import Prism from 'prismjs';
import { visit } from 'unist-util-visit';
import { 
  PenTool, 
  Info, 
  CheckSquare, 
  Flame, 
  Check, 
  HelpCircle, 
  AlertTriangle, 
  X, 
  Zap, 
  Bug, 
  FileText, 
  MessageSquare,
  ClipboardList
} from 'lucide-react';
import FoldableHeading from '../_components/FoldableHeading';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import { useEffect } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

interface MarkdownRendererProps {
  content: string;
  notes?: Note[];
  selectedNote?: Note | null;
  isEditing?: boolean;
  editContent?: string;
  setEditContent?: (content: string) => void;
  setNotes?: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote?: React.Dispatch<React.SetStateAction<Note | null>>;
  isSignedIn?: boolean;
  driveService?: {
    updateFile: (fileId: string, content: string) => Promise<void>;
  };
}

// Utility function to extract text content from React nodes
const getTextContent = (node: unknown): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(getTextContent).join('');
  if (typeof node === 'object' && node !== null &&
    node && typeof node === 'object' && 'props' in node &&
    node.props && typeof node.props === 'object' && 'children' in node.props) {
    return getTextContent((node.props as { children: unknown }).children);
  }
  return '';
};

// Function to strip markdown formatting from text
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
    .replace(/`(.*?)`/g, '$1') // Remove inline code `text`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url) -> text
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough ~~text~~
    .replace(/^#+\s+/, '') // Remove heading markers
    .trim();
};

// Utility function to update checkbox content by line index (safe, preserves all lines)
const updateCheckboxContent = (
  content: string,
  lineIndex: number,
  newChecked: boolean
): string => {
  // console.log('updateCheckboxContent called:', { lineIndex, newChecked, contentLength: content.length });
  
  // Split preserving all lines, including trailing empty lines
  const matchLines = content.match(/[^\n]*\n?|$/g);
  const lines = matchLines ? matchLines.slice(0, -1) : [];
  
  // console.log('Lines found:', lines.length, 'Line index:', lineIndex);
  
  if (lineIndex < 0 || lineIndex >= lines.length) {
    console.warn('Invalid lineIndex:', lineIndex, 'Total lines:', lines.length);
    return content;
  }
  
  const line = lines[lineIndex].replace(/\r?\n$/, '');
  // console.log('Processing line:', line);
  
  const checkboxMatch = line.match(/^(\s*)-\s*\[[ xX]?\]\s*(.*)$/);
  if (checkboxMatch) {
    const [, indent, lineText] = checkboxMatch;
    const newLine = `${indent}- [${newChecked ? 'x' : ' '}] ${lineText}` + (lines[lineIndex].endsWith('\n') ? '\n' : '');
    lines[lineIndex] = newLine;
    // console.log('Updated line:', newLine);
    // Preserve all lines and trailing newlines
    return lines.join('');
  } else {
    // console.warn('No checkbox pattern found in line:', line);
    return content;
  }
};

// Remark plugin to transform callouts
const remarkCallouts = () => {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any) => {
      if (node.children && node.children.length > 0) {
        const firstChild = node.children[0];
        if (firstChild.type === 'paragraph' && firstChild.children && firstChild.children.length > 0) {
          const firstText = firstChild.children[0];
          if (firstText.type === 'text' && firstText.value) {
            const calloutMatch = firstText.value.match(/^\[!(\w+)\](?:\s+(.+))?/);
            if (calloutMatch) {
              const [, calloutType, title] = calloutMatch;
              
              // Transform the blockquote into a callout div
              node.type = 'div';
              node.data = {
                hName: 'div',
                hProperties: {
                  className: 'callout',
                  'data-callout-type': calloutType.toLowerCase(),
                  'data-callout-title': title || ''
                }
              };
              
              // Remove the callout header from the first text node
              firstText.value = firstText.value.replace(/^\[!\w+\](?:\s+.+)?/, '').trim();
              if (!firstText.value) {
                // Remove empty text node
                firstChild.children.shift();
                if (firstChild.children.length === 0) {
                  node.children.shift();
                }
              }
            }
          }
        }
      }
    });
  };
};

// Callout component that matches Obsidian's styling
const Callout: React.FC<{ type: string; title?: string; children: React.ReactNode }> = ({ type, title, children }) => {
  const getCalloutStyles = (calloutType: string) => {
    const styles = {
      note: {
        bg: 'bg-blue-900/20',
        border: 'border-blue-500',
        icon: PenTool,
        iconColor: 'text-blue-400',
        title: 'Note'
      },
      info: {
        bg: 'bg-blue-900/20',
        border: 'border-blue-500',
        icon: Info,
        iconColor: 'text-blue-400',
        title: 'Info'
      },
      todo: {
        bg: 'bg-blue-900/20',
        border: 'border-blue-500',
        icon: CheckSquare,
        iconColor: 'text-blue-400',
        title: 'Todo'
      },
      tip: {
        bg: 'bg-teal-900/20',
        border: 'border-teal-500',
        icon: Flame,
        iconColor: 'text-teal-400',
        title: 'Tip'
      },
      success: {
        bg: 'bg-green-900/20',
        border: 'border-green-500',
        icon: Check,
        iconColor: 'text-green-400',
        title: 'Success'
      },
      question: {
        bg: 'bg-orange-900/20',
        border: 'border-orange-500',
        icon: HelpCircle,
        iconColor: 'text-orange-400',
        title: 'Question'
      },
      warning: {
        bg: 'bg-yellow-900/20',
        border: 'border-yellow-500',
        icon: AlertTriangle,
        iconColor: 'text-yellow-400',
        title: 'Warning'
      },
      failure: {
        bg: 'bg-red-900/20',
        border: 'border-red-500',
        icon: X,
        iconColor: 'text-red-400',
        title: 'Failure'
      },
      danger: {
        bg: 'bg-red-900/20',
        border: 'border-red-500',
        icon: Zap,
        iconColor: 'text-red-400',
        title: 'Danger'
      },
      bug: {
        bg: 'bg-red-900/20',
        border: 'border-red-500',
        icon: Bug,
        iconColor: 'text-red-400',
        title: 'Bug'
      },
      example: {
        bg: 'bg-purple-900/20',
        border: 'border-purple-500',
        icon: FileText,
        iconColor: 'text-purple-400',
        title: 'Example'
      },
              quote: {
          bg: 'bg-gray-800/30',
          border: 'border-gray-500',
          icon: MessageSquare,
          iconColor: 'text-gray-300',
          title: 'Quote'
        },
      // Aliases for compatibility
      error: {
        bg: 'bg-red-900/20',
        border: 'border-red-500',
        icon: Zap,
        iconColor: 'text-red-400',
        title: 'Danger'
      },
      important: {
        bg: 'bg-teal-900/20',
        border: 'border-teal-500',
        icon: Flame,
        iconColor: 'text-teal-400',
        title: 'Tip'
      },
      abstract: {
        bg: 'bg-teal-900/20',
        border: 'border-teal-500',
        icon: ClipboardList,
        iconColor: 'text-teal-400',
        title: 'Abstract'
      },
      help: {
        bg: 'bg-orange-900/20',
        border: 'border-orange-500',
        icon: HelpCircle,
        iconColor: 'text-orange-400',
        title: 'Question'
      }
    };

    return styles[calloutType as keyof typeof styles] || styles.note;
  };

  const calloutStyle = getCalloutStyles(type);
  const displayTitle = title || calloutStyle.title;
  const IconComponent = calloutStyle.icon;

  return (
    <div className={`my-4 rounded-lg border-l-4 ${calloutStyle.border} ${calloutStyle.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent size={18} className={`${calloutStyle.iconColor}`} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white mb-2">{displayTitle}</div>
          <div className="text-gray-300">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const MemoizedMarkdown = memo<MarkdownRendererProps>(({
  content,
  selectedNote,
  isEditing = false,
  editContent = '',
  setEditContent,
  setNotes,
  setSelectedNote,
  isSignedIn = false,
  driveService
}) => {
  // Pre-process content to get all headings with consistent IDs
  // and to ensure $$...$$ blocks are on their own lines
  const preprocessedContent = useMemo(() => {
    // Ensure that any $$...$$ block is on its own line
    // Replace inline $$...$$ with newlines before and after
    // Replace all $$...$$ (multiline) with newlines before and after
    let processed = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, p1) => `\n$$${p1}$$\n`);
    // Remove duplicate newlines
    processed = processed.replace(/\n{3,}/g, '\n\n');
    return processed;
  }, [content]);

  const headingIds = useMemo(() => {
    const lines = preprocessedContent.split('\n');
    const ids: { [lineIndex: number]: string } = {};
    const titleCounts: { [key: string]: number } = {};
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const rawTitle = match[2].trim();
        const cleanTitle = stripMarkdown(rawTitle);
        const baseId = cleanTitle.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();
        titleCounts[baseId] = (titleCounts[baseId] || 0) + 1;
        const id = titleCounts[baseId] === 1 ? baseId : `${baseId}-${titleCounts[baseId]}`;
        ids[index] = id;
      }
    });
    return ids;
  }, [preprocessedContent]);

  // Track current heading index for consistent ID assignment
  let currentHeadingIndex = 0;
  const getHeadingId = (text: string) => {
    const lines = preprocessedContent.split('\n');
    const headingLines = lines.map((line, index) => ({ line, index }))
      .filter(({ line }) => line.match(/^(#{1,6})\s+(.+)$/));
    if (currentHeadingIndex < headingLines.length) {
      const lineIndex = headingLines[currentHeadingIndex].index;
      currentHeadingIndex++;
      return headingIds[lineIndex] || text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    }
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  };

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkCallouts]}
        rehypePlugins={[rehypeKatex]}
        skipHtml={true}
        components={{
        h1: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <FoldableHeading
              level={1}
              id={id}
              className="text-3xl font-bold text-white mb-6 mt-8 border-b border-gray-600 pb-2"
            >
              {children}
            </FoldableHeading>
          );
        },
        h2: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <FoldableHeading
              level={2}
              id={id}
              className="text-2xl font-semibold text-white mb-4 mt-6"
            >
              {children}
            </FoldableHeading>
          );
        },
        h3: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <FoldableHeading
              level={3}
              id={id}
              className="text-xl font-semibold text-white mb-3 mt-5"
            >
              {children}
            </FoldableHeading>
          );
        },
        h4: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <FoldableHeading
              level={4}
              id={id}
              className="text-lg font-medium text-white mb-2 mt-4"
            >
              {children}
            </FoldableHeading>
          );
        },
        h5: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <FoldableHeading
              level={5}
              id={id}
              className="text-base font-medium text-white mb-2 mt-3"
            >
              {children}
            </FoldableHeading>
          );
        },
        h6: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <FoldableHeading
              level={6}
              id={id}
              className="text-sm font-medium text-gray-300 mb-2 mt-3"
            >
              {children}
            </FoldableHeading>
          );
        },
        p: ({ children, ...props }) => {
          const hasBlockChild = React.Children.toArray(children).some((child: any) => {
            // Detect known block wrappers we render (divs for images, skeletons, etc.)
            if (!child || typeof child !== 'object') return false;
            const type = (child as any).type;
            // If this renders to a 'div' or known block-like component, treat as block
            return type === 'div' || type === 'pre' || type === 'table';
          });
          const Wrapper: any = hasBlockChild ? 'div' : 'p';
          return (
            <Wrapper className="mb-4 text-gray-300 leading-relaxed" {...props}>
              {children}
            </Wrapper>
          );
        },
        code: ({ children, className, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;
          const [showAlert, setShowAlert] = React.useState(false);
          const { Alert, AlertTitle, AlertDescription } = require("@/components/ui/alert");
          const { CheckCircle2Icon } = require("lucide-react");

          useEffect(() => {
            Prism.highlightAll();
          }, [children, className]);

          // Copy button for code block
          if (isInline) {
            return (
              <code className="bg-gray-700 text-pink-300 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }

          // Convert children to string for copying
          let codeString = '';
          if (Array.isArray(children)) {
            codeString = children.map(c => (typeof c === 'string' ? c : '')).join('');
          } else if (typeof children === 'string') {
            codeString = children;
          }

          const handleCopy = (e: React.MouseEvent) => {
            e.stopPropagation();
            navigator.clipboard.writeText(codeString);
            setShowAlert(true);
            setTimeout(() => setShowAlert(false), 2000);
          };

          return (
            <div className="relative group/codeblock my-4">
              {showAlert && (
                <Alert variant="default" className="alert-custom fixed bottom-4 right-4 z-50 w-80">
                  <CheckCircle2Icon className="h-5 w-5" />
                  <AlertTitle>Copied!</AlertTitle>
                  <AlertDescription>
                    Code block copied to clipboard.
                  </AlertDescription>
                </Alert>
              )}
              <button
                className="absolute top-2 right-2 opacity-0 group-hover/codeblock:opacity-100 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded p-1 transition-opacity z-10"
                title="Copy code block"
                onClick={handleCopy}
                tabIndex={-1}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" fill="#374151" stroke="#cbd5e1" strokeWidth="2" /><rect x="3" y="3" width="13" height="13" rx="2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" /></svg>
              </button>
              <pre className="bg-gray-800 border border-gray-600 rounded-lg p-4 overflow-x-auto">
                <code className={`text-sm font-mono text-gray-300 language-${match?.[1] || 'text'}`} {...props}>
                  {children}
                </code>
              </pre>
            </div>
          );
        },
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside mb-4 text-gray-300 space-y-1" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside mb-4 text-gray-300 space-y-1" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, node, ...props }) => {
          // Check if this is a task list item (checkbox)
          if (Array.isArray(children) && children.length > 0) {
            const firstChild = children[0];
            // Check if first child is a checkbox input
            if (typeof firstChild === 'object' && firstChild !== null &&
              'type' in firstChild && firstChild.type === 'input' &&
              'props' in firstChild && firstChild.props &&
              typeof firstChild.props === 'object' &&
              'type' in firstChild.props && firstChild.props.type === 'checkbox') {

              const checkboxProps = firstChild.props as { checked?: boolean;[key: string]: unknown };
              const isChecked = checkboxProps.checked;
              const restOfContent = children.slice(1);

              // Find the line index of this checkbox in the original markdown
              let lineIndex = -1;
              if (node && typeof node.position === 'object' && node.position && typeof node.position.start === 'object') {
                lineIndex = node.position.start.line - 1;
              }

              // console.log('Rendering checkbox:', { isChecked, lineIndex, isEditing });

              return (
                <li className="text-gray-300 flex items-baseline gap-2 list-none" {...props}>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(newChecked: boolean) => {
                      // console.log('Checkbox clicked:', { newChecked, lineIndex, isEditing });
                      
                      // Ensure we have valid lineIndex
                      if (lineIndex === -1) {
                        console.warn('Invalid lineIndex for checkbox:', lineIndex);
                        return;
                      }
                      
                      try {
                        if (isEditing && setEditContent) {
                          const updatedContent = updateCheckboxContent(editContent, lineIndex, newChecked);
                          setEditContent(updatedContent);
                          console.log('Updated edit content for checkbox');
                        } else if (selectedNote && setNotes && setSelectedNote) {
                          const updatedContent = updateCheckboxContent(selectedNote.content, lineIndex, newChecked);
                          const updatedNote = {
                            ...selectedNote,
                            content: updatedContent,
                            updatedAt: new Date().toISOString()
                          };
                          setNotes(prev => prev.map(note =>
                            note.id === selectedNote.id ? updatedNote : note
                          ));
                          setSelectedNote(updatedNote);
                          
                          // Sync with Drive if signed in
                          if (isSignedIn && selectedNote.driveFileId && driveService) {
                            driveService.updateFile(selectedNote.driveFileId, updatedContent)
                              .catch((error: unknown) => console.error('Failed to update checkbox in Drive:', error));
                          }
                          // console.log('Updated note content for checkbox');
                        } else {
                          // console.warn('Missing required props for checkbox update:', { 
                          //   isEditing, 
                          //   hasSetEditContent: !!setEditContent, 
                          //   hasSelectedNote: !!selectedNote,
                          //   hasSetNotes: !!setNotes,
                          //   hasSetSelectedNote: !!setSelectedNote
                          // });
                        }
                      } catch (error) {
                        // console.error('Error updating checkbox:', error);
                      }
                    }}
                    className="align-middle flex-shrink-0 -mt-1 w-5 h-5 min-w-[1.25rem] min-h-[1.25rem] cursor-pointer"
                  />
                  <span className={`flex-1 ${isChecked ? 'line-through text-gray-500/70' : 'text-gray-300'}`}>
                    {restOfContent}
                  </span>
                </li>
              );
            }
          }

          return (
            <li className="text-gray-300" {...props}>{children}</li>
          );
        },
        div: ({ children, className, ...props }) => {
          if (className === 'callout') {
            const calloutType = (props as any)['data-callout-type'];
            const calloutTitle = (props as any)['data-callout-title'];
            
            return (
              <Callout type={calloutType} title={calloutTitle}>
                {children}
              </Callout>
            );
          }
          
          if (className === 'math math-display') {
            return (
              <div className="math-display my-6 text-center overflow-x-auto" style={{ minHeight: '2.5em' }} {...props}>
                <div className="inline-block">{children}</div>
              </div>
            );
          }
          return <div className={className} {...props}>{children}</div>;
        },
        blockquote: ({ children, ...props }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4 bg-gray-800 bg-opacity-30 py-2" {...props}>
            {children}
          </blockquote>
        ),
        a: ({ children, href, ...props }) => (
          <a
            href={href}
            className="text-blue-400 hover:text-blue-300 underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        strong: ({ children, ...props }) => (
          <strong className="font-bold text-white" {...props}>{children}</strong>
        ),
        em: ({ children, ...props }) => (
          <em className="italic text-gray-300" {...props}>{children}</em>
        ),
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-gray-600 rounded-lg" {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }) => (
          <thead className="bg-gray-700" {...props}>
            {children}
          </thead>
        ),
        tbody: ({ children, ...props }) => (
          <tbody className="bg-gray-800" {...props}>
            {children}
          </tbody>
        ),
        tr: ({ children, ...props }) => (
          <tr className="border-b border-gray-600" {...props}>
            {children}
          </tr>
        ),
        th: ({ children, ...props }) => (
          <th className="px-4 py-2 text-left text-white font-semibold border-r border-gray-600 last:border-r-0" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="px-4 py-2 text-gray-300 border-r border-gray-600 last:border-r-0" {...props}>
            {children}
          </td>
        ),
        hr: ({ ...props }) => (
          <hr className="border-gray-600 my-8" {...props} />
        ),
        del: ({ children, ...props }) => (
          <del className="line-through text-gray-300" {...props}>{children}</del>
        ),

        img: ({ src, alt, ...props }) => {
          const [isLoading, setIsLoading] = React.useState(true);
          const [hasError, setHasError] = React.useState(false);
          const [imageUrl, setImageUrl] = React.useState<string | null>(null);

          // Reset states when src changes
          React.useEffect(() => {
            setIsLoading(true);
            setHasError(false);
            setImageUrl(null);
          }, [src]);

          // Lightbox + inline edit
          const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
          const [isEditorOpen, setIsEditorOpen] = React.useState(false);

          // Handle Google Drive URLs with direct API access
          if (src && typeof src === 'string' && src.includes('drive.google.com')) {
            // Extract file ID from Google Drive URL
            const fileId = src.match(/id=([^&]+)/)?.[1];
            if (fileId) {
              // Load image directly from Google Drive API
              React.useEffect(() => {
                const loadImageFromDrive = async () => {
                  try {
                    // Import drive service dynamically
                    const { driveService } = await import('../../../lib/googleDrive');
                    
                    // Get access token
                    const accessToken = await driveService.getAccessToken();
                    if (!accessToken) {
                      console.error('No access token available for image');
                      setHasError(true);
                      setIsLoading(false);
                      return;
                    }

                    // Get the file content as blob from Google Drive API
                    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                      headers: {
                        'Authorization': `Bearer ${accessToken}`
                      }
                    });
                    
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      setImageUrl(url);
                      setIsLoading(false);
                      setHasError(false);
                    } else {
                      console.error(`Failed to load image: ${response.status}`);
                      setHasError(true);
                      setIsLoading(false);
                    }
                  } catch (error) {
                    console.error('Failed to load image from Drive:', error);
                    setHasError(true);
                    setIsLoading(false);
                  }
                };

                loadImageFromDrive();

                // Cleanup function to revoke object URL
                return () => {
                  if (imageUrl && imageUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(imageUrl);
                  }
                };
              }, [fileId]);

              // Try to parse width/height hints from alt for layout reservation
              let hintedWidth: number | undefined;
              let hintedHeight: number | undefined;
              if (typeof alt === 'string') {
                const sizeMatch = alt.match(/\|(\d+)x(\d+)/);
                if (sizeMatch) {
                  hintedWidth = Number(sizeMatch[1]);
                  hintedHeight = Number(sizeMatch[2]);
                }
              }

              return (
                <div className="relative my-4 md-img-wrapper">
                  {isLoading && (
                    <div className="flex flex-col space-y-3">
                      <Skeleton className="h-[200px] w-full rounded-xl" />
                    </div>
                  )}
                  {imageUrl && !isLoading && (
                    <>
                      <div className="group relative">
                        <img
                          src={imageUrl}
                          alt={alt || 'Image'}
                          className="md-img cursor-zoom-in"
                          width={hintedWidth}
                          height={hintedHeight}
                          onClick={() => setIsLightboxOpen(true)}
                          {...props}
                        />
                         {/* Action overlay removed per request */}
                      </div>
                      {isEditorOpen && (
                        // @ts-ignore dynamic import path
                        React.createElement(require('../_components/ImageEditor').default, { 
                          src: imageUrl, 
                          driveFileId: (src as string).match(/id=([^&]+)/)?.[1], 
                          onClose: () => setIsEditorOpen(false),
                          onSaved: (newUrl: string) => {
                            try { if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl); } catch {}
                            setImageUrl(newUrl);
                            setIsEditorOpen(false);
                          }
                        })
                      )}
                      {isLightboxOpen && (
                        // @ts-ignore dynamic import path
                        React.createElement(require('../_components/ImageLightbox').default, { 
                          src: imageUrl, 
                          alt, 
                          onClose: () => setIsLightboxOpen(false),
                          onEdit: () => { setIsEditorOpen(true); setIsLightboxOpen(false); }
                        })
                      )}
                    </>
                  )}
                  {hasError && (
                    <div className="bg-gray-700 text-gray-300 p-4 rounded-lg text-center border border-gray-600">
                      <div className="text-sm mb-2">📷</div>
                      <div className="text-xs">[Image: {alt || 'Uploaded image'}]</div>
                    </div>
                  )}
                </div>
              );
            }
          }
          
          // Default image handling
          const handleLoad = () => {
            console.log('Regular image loaded successfully');
            setIsLoading(false);
            setHasError(false);
          };

          const handleError = () => {
            console.log('Regular image failed to load');
            setIsLoading(false);
            setHasError(true);
          };

          // Try to parse width/height hints from markdown alt text like alt="desc|800x400"
          let hintedWidth: number | undefined;
          let hintedHeight: number | undefined;
          if (typeof alt === 'string') {
            const sizeMatch = alt.match(/\|(\d+)x(\d+)/);
            if (sizeMatch) {
              hintedWidth = Number(sizeMatch[1]);
              hintedHeight = Number(sizeMatch[2]);
            }
          }

          return (
            <div className="relative my-4 md-img-wrapper">
              {isLoading && (
                <div className="flex flex-col space-y-3">
                  <Skeleton className="h-[200px] w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              )}
              <>
                {(() => {
                  // Local state to allow live refresh after editing
                  const [inlineUrl, setInlineUrl] = React.useState<string | null>(typeof src === 'string' ? (src as string) : null);
                  React.useEffect(() => {
                    if (typeof src === 'string') setInlineUrl(src as string);
                  }, [src]);
                  // Render image and modals using inlineUrl
                  return (
                    <>
                <div className="group relative">
                  <img
                    src={inlineUrl || (src as string)}
                    alt={alt || 'Image'}
                    className={`md-img ${isLoading ? 'hidden' : ''} cursor-zoom-in`}
                    width={hintedWidth}
                    height={hintedHeight}
                    onLoad={handleLoad}
                    onError={handleError}
                    onClick={() => setIsLightboxOpen(true)}
                    {...props}
                  />
                 {/* Action overlay removed per request */}
                </div>
                {isEditorOpen && (inlineUrl || src) && (
                  // @ts-ignore dynamic import path
                  React.createElement(require('../_components/ImageEditor').default, { 
                    src: (inlineUrl || (src as string)) as string, 
                    onClose: () => setIsEditorOpen(false),
                    onSaved: (newUrl: string) => {
                      try { if (inlineUrl?.startsWith('blob:')) URL.revokeObjectURL(inlineUrl); } catch {}
                      setInlineUrl(newUrl);
                      setIsEditorOpen(false);
                    }
                  })
                )}
                {isLightboxOpen && (inlineUrl || src) && (
                  // @ts-ignore dynamic import path
                  React.createElement(require('../_components/ImageLightbox').default, { 
                    src: (inlineUrl || (src as string)) as string, 
                    alt, 
                    onClose: () => setIsLightboxOpen(false),
                    onEdit: () => { setIsEditorOpen(true); setIsLightboxOpen(false); }
                  })
                )}
                    </>
                  );
                })()}
              </>
              {hasError && (
                <div className="bg-gray-700 text-gray-300 p-4 rounded-lg text-center border border-gray-600">
                  <div className="text-sm mb-2">📷</div>
                  <div className="text-xs">[Image: {alt || 'Image'}]</div>
                </div>
              )}
            </div>
          );
        },
        span: ({ children, className, ...props }) => {
          if (className === 'math math-inline') {
            return <span className="math-inline" {...props}>{children}</span>;
          }
          return <span className={className} {...props}>{children}</span>;
        },
      }}
    >
      {preprocessedContent}
    </ReactMarkdown>
  );
});

MemoizedMarkdown.displayName = 'MemoizedMarkdown';

export default MemoizedMarkdown;
