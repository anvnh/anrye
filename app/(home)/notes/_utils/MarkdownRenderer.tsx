'use client';

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Note } from '../_components/types';
import Prism from 'prismjs';
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

// Utility function to update checkbox content
const updateCheckboxContent = (
  content: string,
  textContent: string,
  newChecked: boolean
): string => {
  const lines = content.split('\n');
  let updated = false;

  const updatedLines = lines.map(line => {
    if (updated) return line;

    // More flexible checkbox matching
    const checkboxMatch = line.match(/^(\s*)-\s+\[([ x])\]\s*(.*)$/);
    if (checkboxMatch) {
      const [, indent, , lineText] = checkboxMatch;
      const lineTextContent = lineText.trim();
      const targetTextContent = textContent.trim();

      // More flexible text matching
      if (lineTextContent === targetTextContent ||
        lineTextContent.includes(targetTextContent) ||
        targetTextContent.includes(lineTextContent)) {
        updated = true;
        return `${indent}- [${newChecked ? 'x' : ' '}] ${lineText}`;
      }
    }
    return line;
  });

  return updatedLines.join('\n');
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
        const title = match[2].trim();
        const baseId = title.toLowerCase()
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
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      skipHtml={true}
      components={{
        h1: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <h1 id={id} className="text-3xl font-bold text-white mb-6 mt-8 border-b border-gray-600 pb-2" {...props}>
              {children}
            </h1>
          );
        },
        h2: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <h2 id={id} className="text-2xl font-semibold text-white mb-4 mt-6" {...props}>
              {children}
            </h2>
          );
        },
        h3: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <h3 id={id} className="text-xl font-semibold text-white mb-3 mt-5" {...props}>
              {children}
            </h3>
          );
        },
        h4: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <h4 id={id} className="text-lg font-medium text-white mb-2 mt-4" {...props}>
              {children}
            </h4>
          );
        },
        h5: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <h5 id={id} className="text-base font-medium text-white mb-2 mt-3" {...props}>
              {children}
            </h5>
          );
        },
        h6: ({ children, ...props }) => {
          const text = getTextContent(children);
          const id = getHeadingId(text);

          return (
            <h6 id={id} className="text-sm font-medium text-gray-300 mb-2 mt-3" {...props}>
              {children}
            </h6>
          );
        },
        p: ({ children, ...props }) => (
          <p className="mb-4 text-gray-300 leading-relaxed" {...props}>
            {children}
          </p>
        ),
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
        li: ({ children, ...props }) => {
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

              const textContent = getTextContent(restOfContent).trim();

              return (
                <li className="text-gray-300 flex items-start gap-2 list-none" {...props}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newChecked = e.target.checked;
                      if (isEditing && setEditContent) {
                        const updatedContent = updateCheckboxContent(editContent, textContent, newChecked);
                        setEditContent(updatedContent);
                      } else if (selectedNote && setNotes && setSelectedNote) {
                        const updatedContent = updateCheckboxContent(selectedNote.content, textContent, newChecked);
                        const updatedNote = {
                          ...selectedNote,
                          content: updatedContent,
                          updatedAt: new Date().toISOString()
                        };
                        setNotes(prev => prev.map(note =>
                          note.id === selectedNote.id ? updatedNote : note
                        ));
                        setSelectedNote(updatedNote);
                        if (isSignedIn && selectedNote.driveFileId && driveService) {
                          driveService.updateFile(selectedNote.driveFileId, updatedContent)
                            .catch((error: unknown) => console.error('Failed to update checkbox in Drive:', error));
                        }
                      }
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer flex-shrink-0"
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
        blockquote: ({ children, ...props }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-4 bg-gray-800 bg-opacity-30 py-2" {...props}>
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
          <del className="line-through text-gray-400" {...props}>{children}</del>
        ),
        div: ({ children, className, ...props }) => {
          if (className === 'math math-display') {
            return (
              <div className="math-display my-6 text-center overflow-x-auto" style={{ minHeight: '2.5em' }} {...props}>
                <div className="inline-block">{children}</div>
              </div>
            );
          }
          return <div className={className} {...props}>{children}</div>;
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
