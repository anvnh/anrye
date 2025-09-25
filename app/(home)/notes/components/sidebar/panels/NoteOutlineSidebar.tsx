'use client';

import { useEffect, useMemo, useState } from 'react';
import { List } from 'lucide-react';

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

  // Extract headings from markdown content with same ID logic as renderer
  const outline = useMemo(() => {
    const lines = content.split('\n');
    const headings: OutlineItem[] = [];
    const titleCounts: { [key: string]: number } = {};
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

        // Use same ID creation logic as markdown renderer
        const baseId = cleanTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();

        // Handle duplicate titles by adding counter
        titleCounts[baseId] = (titleCounts[baseId] || 0) + 1;
        const id = titleCounts[baseId] === 1 ? baseId : `${baseId}-${titleCounts[baseId]}`;

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

  // Setup intersection observer for active heading tracking
  useEffect(() => {
    if (outline.length === 0) return;

    const timer = setTimeout(() => {
      const noteContainer = document.querySelector('.overflow-y-auto');
      const observer = new IntersectionObserver(
        (entries) => {
          const visibleEntry = entries.find(entry => entry.isIntersecting);
          if (visibleEntry && visibleEntry.target instanceof Element) {
            const headingText = visibleEntry.target.textContent?.trim() || '';
            // Find the corresponding outline item by text
            const matchingItem = outline.find(item => item.title === headingText);
            if (matchingItem) {
              setActiveHeading(matchingItem.id);
            }
          }
        },
        {
          root: noteContainer,
          rootMargin: '-20% 0px -80% 0px',
          threshold: 0
        }
      );

      // Observe all headings by finding them with text content
      outline.forEach((item) => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (const heading of headings) {
          const headingText = heading.textContent?.trim() || '';
          if (headingText === item.title) {
            observer.observe(heading);
            break; // Only observe the first match
          }
        }
      });

      return () => observer.disconnect();
    }, 300); // Increased delay to ensure markdown is rendered

    return () => clearTimeout(timer);
  }, [outline]);

  // Simple scroll to heading function
  const scrollToHeading = (id: string) => {
    // Find the target item in outline
    const targetItem = outline.find(item => item.id === id);
    if (!targetItem) return;

    // Find heading by text content instead of relying on ID
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let targetElement: Element | null = null;

    for (const heading of headings) {
      const headingText = heading.textContent?.trim() || '';
      if (headingText === targetItem.title) {
        targetElement = heading;
        break;
      }
    }

    if (!targetElement) return;

    const noteContainer = targetElement.closest('.overflow-y-auto');
    if (noteContainer) {
      // Get element position relative to container
      const containerRect = noteContainer.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();

      // Calculate scroll position
      const relativeTop = elementRect.top - containerRect.top;
      const targetScrollTop = noteContainer.scrollTop + relativeTop - 80; // 80px offset

      noteContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    } else {
      // Fallback
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  return (
    <div className="h-full w-full px-4 py-6 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pb-2 border-b border-gray-600/30">
        <div className="flex items-center gap-2">
          <List size={14} className="text-gray-500" />
          <h3 className="text-xs font-medium text-white">
            Outline
          </h3>
          <span className="text-xs text-gray-500">
            ({outline.length})
          </span>
        </div>
      </div>

      {/* Outline List */}
      <div className="overflow-y-auto flex-1 pt-2">
        {outline.map((item, index) => {
          const isActive = activeHeading === item.id;

          return (
            <button
              key={index}
              onClick={() => scrollToHeading(item.id)}
              className={`
                w-full text-left py-1 px-1 transition-colors text-xs mb-0.5 block
                ${isActive
                  ? 'text-blue-300'
                  : 'text-gray-500 hover:text-gray-300'
                }
              `}
              style={{
                paddingLeft: `${4 + (item.level - 1) * 8}px`
              }}
              title={`Jump to: ${item.title}`}
            >
              <span className="truncate leading-relaxed block">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NoteOutline;
