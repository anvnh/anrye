'use client';

import React, { useMemo, useState } from 'react';
import { Note } from './types';
import { findBacklinks, findOutgoingLinks, BacklinkInfo } from '../utils/backlinkUtils';
import { FileText, ArrowRight, ArrowLeft, Network, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

interface BacklinksPanelProps {
  selectedNote: Note | null;
  allNotes: Note[];
  onNavigateToNote?: (noteId: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  selectedNote,
  allNotes,
  onNavigateToNote,
  isMobile = false,
  onClose
}) => {
  // Local state for responsiveness and UX
  const [isOutgoingCollapsed, setIsOutgoingCollapsed] = useState(false);
  const [isBacklinksCollapsed, setIsBacklinksCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  // Compute links and apply search filtering
  const { backlinks, outgoingLinks, filteredBacklinks, filteredOutgoingLinks } = useMemo(() => {
    if (!selectedNote) {
      return { backlinks: [], outgoingLinks: [], filteredBacklinks: [], filteredOutgoingLinks: [] };
    }

    const allBacklinks = findBacklinks(selectedNote, allNotes);
    const allOutgoingLinks = findOutgoingLinks(selectedNote, allNotes);

    const filterNotes = (notes: Note[]) => {
      if (!searchQuery.trim()) return notes;
      const query = searchQuery.toLowerCase();
      return notes.filter(n =>
        n.title.toLowerCase().includes(query) ||
        (n.path?.toLowerCase().includes(query))
      );
    };

    const filterBacklinksFn = (items: BacklinkInfo[]) => {
      if (!searchQuery.trim()) return items;
      const query = searchQuery.toLowerCase();
      return items.filter(b =>
        b.note.title.toLowerCase().includes(query) ||
        (b.note.path?.toLowerCase().includes(query))
      );
    };

    return {
      backlinks: allBacklinks,
      outgoingLinks: allOutgoingLinks,
      filteredBacklinks: filterBacklinksFn(allBacklinks),
      filteredOutgoingLinks: filterNotes(allOutgoingLinks)
    };
  }, [selectedNote, allNotes, searchQuery]);

  // Helpers and layout preferences
  const clearSearch = () => setSearchQuery('');
  const handleNoteClick = (noteId: string) => {
    onNavigateToNote?.(noteId);
  };
  const compactMode = isMobile || (outgoingLinks.length + backlinks.length) > 10;
  const gridCols = 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="h-full flex flex-col">
      {/* Header with Search */}
      <div className="flex-shrink-0 p-4 border-b border-gray-600/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Network size={20} className="text-blue-400" />
            Linked Notes
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchActive(!isSearchActive)}
              className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Search linked notes"
            >
              <Search size={16} />
            </button>
            {isMobile && onClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                title="Close panel"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {isSearchActive && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search linked notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-blue-400/50"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Connection Summary */}
        <div className="flex items-center justify-between text-sm text-gray-400 mt-3">
          <span>
            {searchQuery ?
              `Found ${filteredOutgoingLinks.length + filteredBacklinks.length} matches` :
              `${outgoingLinks.length + backlinks.length} total connections`
            }
          </span>
          {(outgoingLinks.length + backlinks.length) > 5 && (
            <span className="text-xs">
              {compactMode ? 'Compact view' : 'Full view'}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Outgoing Links Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowRight size={16} className="text-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                  Linked Notes ({searchQuery ? filteredOutgoingLinks.length : outgoingLinks.length})
                </h3>
              </div>
              {outgoingLinks.length > 3 && !isMobile && (
                <button
                  onClick={() => setIsOutgoingCollapsed(!isOutgoingCollapsed)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title={isOutgoingCollapsed ? "Expand" : "Collapse"}
                >
                  {isOutgoingCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              )}
            </div>

            {isOutgoingCollapsed ? null : (
              (searchQuery ? filteredOutgoingLinks : outgoingLinks).length > 0 ? (
                <div className={`transition-opacity duration-200`}>
                  <div className={`space-y-2`}>
                    {(searchQuery ? filteredOutgoingLinks : outgoingLinks).map(note => (
                      <div
                        key={note.id}
                        className={`group cursor-pointer ${compactMode ? 'p-2' : 'p-3'} bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/30 hover:border-blue-400/30 transition-all duration-200`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNoteClick(note.id);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <FileText size={compactMode ? 14 : 16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-white font-medium group-hover:text-blue-300 transition-colors text-sm truncate`}>
                              {note.title}
                            </h4>
                            {note.path && !compactMode && (
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {note.path}
                              </p>
                            )}
                            {/* Connection strength indicator */}
                            {!compactMode && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                                <span className="text-xs text-blue-400/70">Direct link</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  {searchQuery ?
                    "No linked notes match your search." :
                    "This note doesn't link to any other notes. Try adding some [[wikilinks]]!"
                  }
                </p>
              )
            )}
          </div>

          {/* Backlinks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowLeft size={16} className="text-green-400" />
                <h3 className="text-lg font-semibold text-white">
                  Backlinks ({searchQuery ? filteredBacklinks.length : backlinks.length})
                </h3>
              </div>
              {backlinks.length > 3 && !isMobile && (
                <button
                  onClick={() => setIsBacklinksCollapsed(!isBacklinksCollapsed)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title={isBacklinksCollapsed ? "Expand" : "Collapse"}
                >
                  {isBacklinksCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              )}
            </div>

            {isBacklinksCollapsed ? null : (
              (searchQuery ? filteredBacklinks : backlinks).length > 0 ? (
                <div className={`transition-opacity duration-200`}>
                  <div className={`space-y-3`}>
                    {(searchQuery ? filteredBacklinks : backlinks).map((backlink: BacklinkInfo) => (
                      <div
                        key={backlink.note.id}
                        className={`group cursor-pointer ${compactMode ? 'p-2' : 'p-3'} bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/30 hover:border-green-400/30 transition-all duration-200`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNoteClick(backlink.note.id);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <FileText size={compactMode ? 14 : 16} className="text-green-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-white font-medium group-hover:text-green-300 transition-colors ${compactMode ? 'text-sm' : ''} truncate`}>
                              {backlink.note.title}
                            </h4>
                            {backlink.note.path && !compactMode && (
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {backlink.note.path}
                              </p>
                            )}

                            {/* Connection strength indicator */}
                            {!compactMode && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className={`w-1 h-1 bg-green-400 rounded-full ${backlink.occurrences.length > 1 ? 'animate-pulse' : ''}`}></div>
                                <span className="text-xs text-green-400/70">
                                  {backlink.occurrences.length} reference{backlink.occurrences.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}

                            {/* Show context snippets */}
                            {!compactMode && (
                              <div className="mt-2 space-y-1">
                                {backlink.occurrences.slice(0, isMobile ? 1 : 2).map((occurrence, idx) => (
                                  <div key={idx} className="text-xs text-gray-300 bg-gray-900/50 p-2 rounded border-l-2 border-green-400/30">
                                    <span className="text-gray-500">Line {occurrence.line}:</span>
                                    <div className="mt-1 font-mono leading-relaxed">
                                      {occurrence.context.length > 80 && isMobile ?
                                        `${occurrence.context.substring(0, 80)}...` :
                                        occurrence.context
                                      }
                                    </div>
                                  </div>
                                ))}
                                {backlink.occurrences.length > (isMobile ? 1 : 2) && (
                                  <p className="text-xs text-gray-500 pl-2">
                                    +{backlink.occurrences.length - (isMobile ? 1 : 2)} more occurrences
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  {searchQuery ?
                    "No backlinks match your search." :
                    `No notes link to this note yet. Share its title with [[${selectedNote?.title ?? ''}]] in other notes to create backlinks!`
                  }
                </p>
              )
            )}
          </div>

          {/* Enhanced Summary */}
          {!searchQuery && (outgoingLinks.length > 0 || backlinks.length > 0) && (
            <div className="pt-4 border-t border-gray-600/30">
              <div className="text-sm text-gray-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Total connections:</span>
                  <span className="text-white font-medium">
                    {outgoingLinks.length + backlinks.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <ArrowRight size={12} className="text-blue-400" />
                    <span>{outgoingLinks.length} outgoing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowLeft size={12} className="text-green-400" />
                    <span>{backlinks.length} incoming</span>
                  </div>
                </div>
                {/* Connection health indicator */}
                {(outgoingLinks.length + backlinks.length) > 0 && (
                  <div className="mt-3 p-2 bg-gray-800/30 rounded border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${(outgoingLinks.length + backlinks.length) > 5 ? 'bg-green-400' :
                        (outgoingLinks.length + backlinks.length) > 2 ? 'bg-yellow-400' :
                          'bg-blue-400'
                        }`}></div>
                      <span className="text-xs font-medium">
                        {(outgoingLinks.length + backlinks.length) > 5 ? 'Highly connected' :
                          (outgoingLinks.length + backlinks.length) > 2 ? 'Well connected' :
                            'Lightly connected'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {(outgoingLinks.length + backlinks.length) > 5 ?
                        'This note is a central hub in your knowledge graph.' :
                        (outgoingLinks.length + backlinks.length) > 2 ?
                          'This note has good integration with your knowledge base.' :
                          'Consider adding more connections to strengthen this note\'s role.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BacklinksPanel;
