'use client';

import { useEffect, useMemo, useState } from 'react';
import { List, X } from 'lucide-react';

interface OutlineItem {
  id: string;
  title: string;
  level: number;
  line: number;
}

interface NoteOutlineProps {
  content: string;
}

const NoteOutline: React.FC<NoteOutlineProps> = ({ content }) => {
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);

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

  // Extract headings from markdown content
  const outline = useMemo(() => {
    const lines = content.split('\n');
    const headings: OutlineItem[] = [];
    const fenceRegex = /^\s*(```|~~~)/;
    let inFence = false;

    lines.forEach((line, index) => {
      if (fenceRegex.test(line)) {
        inFence = !inFence;
        return;
      }
      if (inFence) return;
      // Ignore indented code blocks (4+ leading spaces or a tab)
      if (/^(\t| {4,})/.test(line)) return;

      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        const cleanTitle = stripMarkdown(rawTitle);
        const id = cleanTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();

        headings.push({
          id,
          title: cleanTitle,
          level,
          line: index + 1
        });
      }
    });

    return headings;
  }, [content]);

  // Add IDs to headings and setup intersection observer
  useEffect(() => {
    if (outline.length === 0) return;

    const timer = setTimeout(() => {
      outline.forEach((item) => {
        // Find heading elements and add IDs
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading) => {
          const headingText = heading.textContent?.trim() || '';
          if (headingText === item.title) {
            heading.id = item.id;
          }
        });
      });

      // Setup intersection observer for active heading tracking
      const observer = new IntersectionObserver(
        (entries) => {
          const visibleEntry = entries.find(entry => entry.isIntersecting);
          if (visibleEntry) {
            setActiveHeading(visibleEntry.target.id);
          }
        },
        {
          rootMargin: '-20% 0px -80% 0px',
          threshold: 0
        }
      );

      // Observe all headings
      outline.forEach((item) => {
        const element = document.getElementById(item.id);
        if (element) {
          observer.observe(element);
        }
      });

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timer);
  }, [outline]);

  // Don't render if no headings found
  if (outline.length === 0) {
    return null;
  }

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-6 z-20 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg shadow-lg border border-gray-600 transition-colors"
        title="Toggle Outline"
      >
        <List size={20} />
      </button>

      {/* Outline Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsOpen(false)}
          />

          {/* Outline Content */}
          <div className="fixed top-4 right-4 w-80 max-h-[70vh] bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-40 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-600 bg-gray-750">
              <div className="flex items-center gap-2">
                <List size={16} className="text-blue-400" />
                <h3 className="text-base font-semibold text-white">Outline</h3>
                <span className="text-xs text-gray-400">
                  ({outline.length})
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Outline List */}
            <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(70vh - 60px)' }}>
              {outline.map((item, index) => {
                const isActive = activeHeading === item.id;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      scrollToHeading(item.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full text-left py-2 px-2 rounded transition-colors text-sm group border-l-2
                      ${isActive
                        ? 'bg-blue-600 bg-opacity-20 text-blue-300 border-blue-400'
                        : 'hover:bg-gray-700 text-gray-300 hover:text-white border-transparent hover:border-blue-400'
                      }
                    `}
                    style={{
                      paddingLeft: `${8 + (item.level - 1) * 12}px`
                    }}
                    title={`Jump to: ${item.title}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`
                        text-xs px-1.5 py-0.5 rounded text-center min-w-[20px] mt-0.5 font-mono
                        ${isActive
                          ? 'bg-blue-500 text-white'
                          : item.level === 1 ? 'bg-blue-600 text-white' :
                            item.level === 2 ? 'bg-blue-500 text-white' :
                              item.level === 3 ? 'bg-blue-400 text-white' :
                                'bg-gray-600 text-gray-300'}
                      `}>
                        {item.level}
                      </span>
                      <span className="truncate leading-relaxed">{item.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default NoteOutline;
