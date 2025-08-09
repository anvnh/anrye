'use client';

import React from 'react';
import { Note } from './types';
import { FileText } from 'lucide-react';

interface WikilinkAutocompleteProps {
  isOpen: boolean;
  suggestions: Note[];
  selectedIndex: number;
  position: { top: number; left: number } | null;
  onSelect: (note: Note) => void;
  onClose: () => void;
  query: string;
}

const WikilinkAutocomplete: React.FC<WikilinkAutocompleteProps> = ({
  isOpen,
  suggestions,
  selectedIndex,
  position,
  onSelect,
  onClose,
  query
}) => {
  if (!isOpen || !position || suggestions.length === 0) {
    return null;
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-blue-500/25 text-blue-300 px-0.5 rounded font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Backdrop to close on click */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Autocomplete dropdown */}
      <div
        className="absolute z-50 bg-secondary border border-gray-600/50 rounded-lg shadow-2xl max-w-sm w-72 max-h-64 overflow-y-auto backdrop-blur-md"
        style={{
          top: position.top,
          left: position.left,
          backgroundColor: '#31363F',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="p-2">
          <div className="text-xs text-gray-400 mb-2 px-2 border-b border-gray-600/30 pb-2">
            {query ? `Searching for "${query}"` : 'All notes'} • {suggestions.length} result{suggestions.length !== 1 ? 's' : ''}
          </div>
          
          {suggestions.map((note, index) => (
            <div
              key={note.id}
              className={`flex items-start gap-3 p-3 mx-1 rounded-lg cursor-pointer transition-all duration-200 border ${
                index === selectedIndex
                  ? 'bg-blue-600/15 border-blue-400/40 shadow-lg'
                  : 'hover:bg-gray-700/30 border-transparent hover:border-gray-600/30'
              }`}
              onClick={() => onSelect(note)}
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
                {note.path && (
                  <div className="text-xs text-gray-500 mt-1 truncate opacity-75">
                    {note.path}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-600/30 p-3 bg-main/50" style={{ backgroundColor: '#222831aa' }}>
          <div className="text-xs text-gray-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-300 font-mono text-xs">↑↓</span>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-300 font-mono text-xs">Enter</span>
              select
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-300 font-mono text-xs">Esc</span>
              close
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default WikilinkAutocomplete;
