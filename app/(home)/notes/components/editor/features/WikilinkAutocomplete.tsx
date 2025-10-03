'use client';

import React, { useEffect, useRef } from 'react';
import { Note } from '../../types';
import { FileText } from 'lucide-react';

interface WikilinkAutocompleteProps {
  isOpen: boolean;
  suggestions: Note[];
  selectedIndex: number;
  position: { top: number; left: number } | null;
  onSelect: (note: Note) => void;
  onClose: () => void;
  query: string;
  positionMode?: 'fixed' | 'absolute';
  onHoverIndexChange?: (index: number) => void;
}

const WikilinkAutocomplete: React.FC<WikilinkAutocompleteProps> = ({
  isOpen,
  suggestions,
  selectedIndex,
  position,
  onSelect,
  onClose,
  query,
  positionMode = 'fixed',
  onHoverIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep the active item visible while navigating
  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current?.querySelector(
      `[data-suggestion-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (el) {
      try {
        el.scrollIntoView({ block: 'nearest' });
      } catch {}
    }
  }, [isOpen, selectedIndex, suggestions.length]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!containerRef.current?.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isOpen, onClose]);

  if (!isOpen || !position || suggestions.length === 0) {
    return null;
  }

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    try {
      const safe = escapeRegExp(query);
      const regex = new RegExp(`(${safe})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, index) => (
        index % 2 === 1 ? (
          <span key={index} className="bg-blue-500/25 text-blue-300 px-0.5 rounded font-medium">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      ));
    } catch {
      return text;
    }
  };

  return (
    <div
      ref={containerRef}
      data-wikilink-autocomplete
      className={`${positionMode === 'fixed' ? 'fixed' : 'absolute'} z-50 bg-secondary border border-gray-600/50 rounded-lg shadow-2xl max-w-sm w-72 max-h-64 overflow-y-auto backdrop-blur-md pointer-events-auto`}
      style={{
        top: position.top,
        left: position.left,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }}
      onMouseDown={(e) => {
        // Prevent focus loss from textarea
        e.preventDefault();
      }}
    >
      <div className="p-2">
        <div className="text-xs text-gray-400 mb-2 px-2 border-b border-gray-600/30 pb-2">
          {query ? `Searching for "${query}"` : 'All notes'} • {suggestions.length} result{suggestions.length !== 1 ? 's' : ''}
        </div>
        
        {suggestions.map((note, index) => (
          <div
            key={note.id}
            data-suggestion-index={index}
            className={`flex items-start gap-3 p-3 mx-1 rounded-lg cursor-pointer transition-all duration-200 border ${
              index === selectedIndex
                ? 'bg-blue-600/5 border-blue-400/40 shadow-lg'
                : 'hover:bg-gray-700/30 border-transparent hover:border-gray-600/30'
            }`}
            onClick={() => onSelect(note)}
            onMouseEnter={() => {
              if (index !== selectedIndex) onHoverIndexChange?.(index);
            }}
          >
            <FileText 
              size={16} 
              className={`mt-0.5 flex-shrink-0 ${
                index === selectedIndex ? 'text-blue-400' : 'text-gray-400'
              }`} 
            />
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate transition-colors ${
                index === selectedIndex ? 'text-blue-200' : 'text-primary'
              }`}
              style={{ color: index === selectedIndex ? '#bfdbfe' : '#EEEEEE' }}>
                {highlightMatch(note.title, query)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {note.path && (
                  <div className="text-xs text-gray-500 truncate opacity-75">
                    {note.path}
                  </div>
                )}
                <div className="text-xs text-gray-600 font-mono opacity-60">
                  {note.id}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
};

export default WikilinkAutocomplete;
