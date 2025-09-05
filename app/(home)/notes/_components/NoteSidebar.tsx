'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/app/lib/hooks/useDebounce';
import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderOpen, FileText, FolderPlus, Trash2, Cloud, CloudOff, Edit, Type, Move, RefreshCw, PanelLeftClose, PanelLeftOpen, Home, Menu, Cog, ArrowUpDown, Star, X, Search, Lock, Unlock, Shield } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { NoteSidebarProps, Note, Folder } from './types';
import { MobileItemMenu } from './MobileFileOperations';
import { NoteEncryptionDialog, EncryptionStatusBadge } from './NoteEncryption';
import MoveDrawer from './MoveDrawer';
import { ImagesSection } from './ImagesSection';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

export default function NoteSidebar({
  notes,
  folders,
  selectedNote,
  isSignedIn,
  isLoading,
  syncProgress,
  sidebarWidth,
  dragOver: _dragOver,
  isMobileSidebarOpen,
  isSidebarHidden,
  isImagesSectionExpanded,
  // isResizing, // Currently unused but kept for future feature
  onToggleFolder,
  onSelectNote,
  onSetSelectedPath,
  onSetIsCreatingFolder,
  onSetIsCreatingNote,
  onDeleteFolder,
  onDeleteNote,
  onRenameFolder,
  onRenameNote,
  onDragStart,
  onDragOver: _onDragOver,
  onDragLeave: _onDragLeave,
  onDrop,
  onSetDragOver: _onSetDragOver,
  onSetDraggedItem,
  onSetIsResizing,
  onSetIsMobileSidebarOpen,
  onToggleSidebar,
  onToggleImagesSection,
  onForceSync,
  onClearCacheAndSync,
  onSignIn,
  onSignOut,
  onEncryptNote,
  onDecryptNote,
  notesTheme,
}: NoteSidebarProps) {

  // Add state for mobile menu collapsible
  const [isMobileMenuExpanded, setIsMobileMenuExpanded] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Debounced search query for better performance
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  type FolderSort = 'az' | 'za';
  type FileSort = 'az' | 'za' | 'newest' | 'oldest';
  type TimeSort = 'none' | 'newest' | 'oldest';

  const [folderSort, setFolderSort] = useState<FolderSort>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('sidebar-sort-folder') as FolderSort | null;
      if (v === 'az' || v === 'za') return v;
      // legacy fallback
      const legacy = localStorage.getItem('sidebar-sort-mode');
      if (legacy === 'folders-za') return 'za';
    }
    return 'az';
  });

  const [fileSort, setFileSort] = useState<FileSort>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('sidebar-sort-file') as FileSort | null;
      if (v === 'az' || v === 'za' || v === 'newest' || v === 'oldest') return v;
      // legacy fallback
      const legacy = localStorage.getItem('sidebar-sort-mode');
      if (legacy === 'files-za') return 'za';
      if (legacy === 'newest') return 'newest';
      if (legacy === 'oldest') return 'oldest';
      if (legacy === 'files-az') return 'az';
    }
    return 'az';
  });

  const [timeSort, setTimeSort] = useState<TimeSort>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('sidebar-sort-time') as TimeSort | null;
      if (v === 'none' || v === 'newest' || v === 'oldest') return v;
      // migrate từ legacy single-mode
      const legacy = localStorage.getItem('sidebar-sort-mode');
      if (legacy === 'newest' || legacy === 'oldest') return legacy as TimeSort;
    }
    return 'none';
  });

  const isTimeSorting = timeSort !== 'none';
  const isSearching = !!debouncedSearchQuery.trim();

  // Helper function for better search matching
  const searchScore = useMemo(() => {
    return (text: string, query: string): number => {
      if (!text || !query) return 0;

      const textLower = text.toLowerCase();
      const queryLower = query.toLowerCase();

      // Exact match gets highest score
      if (textLower === queryLower) return 100;

      // Starts with query gets high score
      if (textLower.startsWith(queryLower)) return 90;

      // Contains as whole word gets medium-high score
      try {
        const wordBoundaryRegex = new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (wordBoundaryRegex.test(textLower)) return 80;
      } catch {
        // Fallback if regex is invalid
      }

      // Contains query gets medium score
      if (textLower.includes(queryLower)) return 70;

      // Fuzzy match for partial matches
      const words = queryLower.split(/\s+/).filter(Boolean);
      let matchedWords = 0;

      for (const word of words) {
        if (textLower.includes(word)) {
          matchedWords++;
        }
      }

      if (matchedWords > 0) {
        return 50 + (matchedWords / words.length) * 20;
      }

      return 0;
    };
  }, []);

  // Filter notes and folders based on search query with scoring
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return { notes, folders };
    }

    const query = debouncedSearchQuery.trim();
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

    // Enhanced note filtering with multiple criteria
    const noteResults = notes.map(note => {
      let maxScore = 0;

      // Search in title (highest priority)
      const titleScore = searchScore(note.title, query);
      maxScore = Math.max(maxScore, titleScore);

      // Search in file path
      const pathScore = searchScore(note.path || '', query) * 0.8; // Slightly lower priority
      maxScore = Math.max(maxScore, pathScore);

      // Search in content (lower priority for performance)
      const contentScore = searchScore(note.content || '', query) * 0.6;
      maxScore = Math.max(maxScore, contentScore);

      // Bonus for matching multiple words
      if (queryWords.length > 1) {
        const allWordsInTitle = queryWords.every(word =>
          note.title.toLowerCase().includes(word)
        );
        if (allWordsInTitle) {
          maxScore += 10;
        }
      }

      return { note, score: maxScore };
    }).filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.note);

    // Enhanced folder filtering
    const folderResults = folders.map(folder => {
      let maxScore = 0;

      // Search in folder name
      const nameScore = searchScore(folder.name, query);
      maxScore = Math.max(maxScore, nameScore);

      // Search in folder path
      const pathScore = searchScore(folder.path || '', query) * 0.8;
      maxScore = Math.max(maxScore, pathScore);

      return { folder, score: maxScore };
    }).filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.folder);

    // Ensure all ancestors of matched notes and folders are included so tree traversal can reach matches
    const folderByPath = new Map<string, Folder>();
    for (const f of folders) {
      folderByPath.set(f.path, f);
    }

    const includeFolderPaths = new Set<string>();

    const addAncestors = (path: string | undefined | null) => {
      if (!path) return;
      const parts = path.split('/').filter(Boolean);
      let acc = '';
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        includeFolderPaths.add(acc);
      }
    };

    // Ancestors for matched notes
    for (const n of noteResults) {
      addAncestors(n.path || '');
    }
    // Ancestors for matched folders
    for (const f of folderResults) {
      addAncestors(f.path || '');
    }

    // Merge: matched folders + ancestor folders
    const ancestorFolders: Folder[] = Array.from(includeFolderPaths)
      .map(p => folderByPath.get(p))
      .filter((f): f is Folder => Boolean(f));

    const finalFoldersMap = new Map<string, Folder>();
    for (const f of folderResults) finalFoldersMap.set(f.id, f);
    for (const f of ancestorFolders) finalFoldersMap.set(f.id, f);
    const finalFolders = Array.from(finalFoldersMap.values());

    return { notes: noteResults, folders: finalFolders };
  }, [notes, folders, debouncedSearchQuery]);

  // Pinned state (ids for folders and notes)
  const [pinnedFolderIds, setPinnedFolderIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('sidebar-pinned-folders');
      if (raw) {
        try {
          const arr = JSON.parse(raw) as string[];
          return new Set(arr);
        } catch { }
      }
    }
    return new Set();
  });

  const [pinnedNoteIds, setPinnedNoteIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('sidebar-pinned-notes');
      if (raw) {
        try {
          const arr = JSON.parse(raw) as string[];
          return new Set(arr);
        } catch { }
      }
    }
    return new Set();
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-pinned-folders', JSON.stringify(Array.from(pinnedFolderIds)));
    }
  }, [pinnedFolderIds]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-pinned-notes', JSON.stringify(Array.from(pinnedNoteIds)));
    }
  }, [pinnedNoteIds]);

  const togglePin = (item: Note | Folder, type: 'note' | 'folder') => {
    if (type === 'folder') {
      setPinnedFolderIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
        return next;
      });
    } else {
      setPinnedNoteIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
        return next;
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-sort-folder', folderSort);
      localStorage.setItem('sidebar-sort-file', fileSort);
      localStorage.setItem('sidebar-sort-time', timeSort);
    }
  }, [folderSort, fileSort, timeSort]);

  // Move dialog state and handlers (works on both mobile and desktop)
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<{ item: Note | Folder; type: 'note' | 'folder' } | null>(null);

  const handleMobileMove = (item: Note | Folder, type: 'note' | 'folder') => {
    setMoveItem({ item, type });
    setIsMoveDialogOpen(true);
  };

  const handleMoveConfirm = (targetFolderId: string, newTitle?: string) => {
    if (!moveItem) return;
    // Call onDrop with explicit dragged item to avoid async state timing issues
    const fakeEvent = {
      preventDefault: () => { },
      stopPropagation: () => { },
    } as unknown as React.DragEvent;
    onDrop(fakeEvent, targetFolderId, { type: moveItem.type, id: moveItem.item.id }, newTitle);
    setMoveItem(null);
    setIsMoveDialogOpen(false);
  };

  // const getNotesInPath = (path: string) => {
  //   return notes.filter(note => note.path === path);
  // };
  const getNotesInPath = (path: string, notesToFilter = notes) => {
    return notesToFilter.filter(note => note.path === path);
  };

  // const getSubfolders = (parentPath: string) => {
  //   return folders.filter(folder => {
  //     if (parentPath === '') {
  //       return folder.parentId === 'root' && folder.id !== 'root';
  //     }
  //     return folder.path.startsWith(parentPath + '/') &&
  //       folder.path.split('/').length === parentPath.split('/').length + 1;
  //   });
  // };
  const getSubfolders = (parentPath: string, foldersToFilter = folders) => {
    return foldersToFilter.filter(folder => {
      if (parentPath === '') {
        return folder.parentId === 'root' && folder.id !== 'root';
      }
      return folder.path.startsWith(parentPath + '/') &&
        folder.path.split('/').length === parentPath.split('/').length + 1;
    });
  };

  const folderUpdatedAtMap = useMemo(() => {
    const m = new Map<string, number>();
    // root path
    m.set('', 0);

    const toTime = (d: any) => {
      const t = d ? new Date(d).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };

    for (const n of notes) {
      const t = toTime((n as any).updatedAt);
      const path = n.path || '';
      // Update root path
      m.set('', Math.max(m.get('') || 0, t));
      // Update for each folder in the path
      if (path) {
        const parts = path.split('/').filter(Boolean);
        let acc = '';
        for (const p of parts) {
          acc = acc ? `${acc}/${p}` : p;
          m.set(acc, Math.max(m.get(acc) || 0, t));
        }
      }
    }
    return m;
  }, [notes]);

  const renderFileTree = (parentPath: string = '', level: number = 0) => {
    const { notes: filteredNotes, folders: filteredFolders } = filteredData;

    const subfolders = getSubfolders(parentPath, filteredFolders);
    const notesInPath = getNotesInPath(parentPath, filteredNotes);

    const sortedSubfolders = [...subfolders];
    const sortedNotes = [...notesInPath];

    const getTime = (d: any) => {
      const t = d ? new Date(d).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };

    // Nếu timeSort đang bật → áp dụng cho cả folder + file
    if (timeSort !== 'none') {
      const folderTime = (f: Folder) =>
        folderUpdatedAtMap.get(f.path) ??
        getTime((f as any).updatedAt); // fallback nếu Folder có updatedAt

      const noteTime = (n: Note) => getTime((n as any).updatedAt);

      const cmp = timeSort === 'newest'
        ? (a: number, b: number) => b - a
        : (a: number, b: number) => a - b;

      sortedSubfolders.sort((a, b) => cmp(folderTime(a), folderTime(b)));
      sortedNotes.sort((a, b) => cmp(noteTime(a), noteTime(b)));
    } else {
      // Không sort theo thời gian → dùng 2 state riêng
      // Folders: A→Z / Z→A
      sortedSubfolders.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      if (folderSort === 'za') sortedSubfolders.reverse();

      // Files: A→Z / Z→A
      if (fileSort === 'az' || fileSort === 'za') {
        sortedNotes.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );
        if (fileSort === 'za') sortedNotes.reverse();
      } else {
        // (Dự phòng nếu còn giá trị cũ)
        sortedNotes.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        );
      }
    }

    // Group pinned items to top but keep internal sort
    const pinnedFirstFolders = sortedSubfolders.sort((a, b) => {
      const pa = pinnedFolderIds.has(a.id) ? 1 : 0;
      const pb = pinnedFolderIds.has(b.id) ? 1 : 0;
      return pb - pa; // pinned first
    });
    const pinnedFirstNotes = sortedNotes.sort((a, b) => {
      const pa = pinnedNoteIds.has(a.id) ? 1 : 0;
      const pb = pinnedNoteIds.has(b.id) ? 1 : 0;
      return pb - pa; // pinned first
    });

    return (
      <div className={level > 0 ? 'ml-3' : ''}>
        {/* Render subfolders */}
        {pinnedFirstFolders.map(folder => (
          <div key={folder.id} className="mb-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={`
                    flex items-center py-2.5 rounded-lg cursor-pointer group 
                    transition-all duration-200 ease-in-out
                    hover:bg-gray-700/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                    ${level > 0 ? 'ml-2' : ''}
                  `}
                  onClick={() => {
                    onToggleFolder(folder.id);
                    onSetSelectedPath(folder.path);
                  }}
                >
                  {folder.expanded ? (
                    <ChevronDown size={16} className="text-gray-400 mr-2 transition-transform duration-200" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400 mr-2 transition-transform duration-200" />
                  )}
                  {folder.expanded ? (
                    <FolderOpen size={16} className="text-blue-400 mr-3 transition-colors duration-200" />
                  ) : (
                    <FolderIcon size={16} className="text-blue-400 mr-3 transition-colors duration-200" />
                  )}
                  <span
                    className="text-gray-300 text-sm flex-1 truncate font-medium min-w-0 flex items-center justify-between gap-1"
                    title={folder.name}
                  >
                    {folder.name}
                    {pinnedFolderIds.has(folder.id) && (
                      <Star size={12} className="text-yellow-400 flex-shrink-0" />
                    )}
                  </span>
                  <div className="flex-shrink-0 ml-2">
                    <MobileItemMenu
                      item={folder}
                      itemType="folder"
                      isPinned={pinnedFolderIds.has(folder.id)}
                      onCreateFolder={(path: string) => {
                        onSetSelectedPath(path);
                        onSetIsCreatingFolder(true);
                      }}
                      onCreateNote={(path: string) => {
                        onSetSelectedPath(path);
                        onSetIsCreatingNote(true);
                      }}
                      onRenameItem={(id: string, name: string) => onRenameFolder(id, name)}
                      onDeleteItem={(id: string) => onDeleteFolder(id)}
                      onTogglePin={(it) => togglePin(it as Folder, 'folder')}
                      onMoveItem={handleMobileMove}
                    />
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-sidebar-context-menu border-gray-600 text-gray-300 rounded-lg shadow-xl">
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={() => togglePin(folder, 'folder')}
                >
                  <Star size={16} className="mr-2" />
                  {pinnedFolderIds.has(folder.id) ? 'Unpin' : 'Pin'}
                </ContextMenuItem>
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={() => {
                    onSetSelectedPath(folder.path);
                    onSetIsCreatingFolder(true);
                  }}
                >
                  <FolderPlus size={16} className="mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={() => {
                    onSetSelectedPath(folder.path);
                    onSetIsCreatingNote(true);
                  }}
                >
                  <FileText size={16} className="mr-2" />
                  New Note
                </ContextMenuItem>
                {folder.id !== 'root' && (
                  <>
                    <ContextMenuItem
                      className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                      onClick={() => handleMobileMove(folder, 'folder')}
                    >
                      <Move size={16} className="mr-2" />
                      Move to
                    </ContextMenuItem>
                    <ContextMenuSeparator className="bg-gray-600 mx-1" />
                    <ContextMenuItem
                      className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                      onClick={() => onRenameFolder(folder.id, folder.name)}
                    >
                      <Type size={16} className="mr-2" />
                      Rename Folder
                    </ContextMenuItem>
                    <ContextMenuItem
                      variant="default"
                      className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300 rounded-md mx-1 my-0.5"
                      onClick={() => onDeleteFolder(folder.id)}
                    >
                      <Trash2 size={16} className="mr-2 text-red-400" />
                      Delete Folder
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
            {(isSearching || folder.expanded) && renderFileTree(folder.path, level + 1)}
          </div>
        ))}

        {/* Render notes */}
        {pinnedFirstNotes.map(note => (
          <div key={note.id} className="mb-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={`
                    flex items-center py-2 rounded-lg cursor-pointer group transition-all duration-200 ease-in-out
                    hover:bg-gray-700/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                    ${selectedNote?.id === note.id ? `${notesTheme === 'light' ? 'light-bg-sidebar-activefile' : 'bg-sidebar-activefile'} shadow-lg ring-1 ring-gray-500/30` : ''}
                    ${level > 0 ? 'ml-2' : ''}
                  `}
                  onClick={() => {
                    onSelectNote(note);
                    // Close mobile sidebar when selecting a note
                    if (isMobileSidebarOpen) {
                      onSetIsMobileSidebarOpen(false);
                    }
                  }}
                >
                  <div className="w-4 mr-2"></div>
                  <FileText size={16} className="text-gray-400 mr-3 transition-colors duration-200" />
                  <span
                    className="text-gray-300 text-sm flex-1 truncate min-w-0 flex items-center gap-1 justify-between"
                    title={note.title}
                  >
                    <span className="truncate">{note.title}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {note.isEncrypted && (
                        <EncryptionStatusBadge isEncrypted={true} className="text-xs px-1 py-0" />
                      )}
                      {pinnedNoteIds.has(note.id) && (
                        <Star size={12} className="text-yellow-400" />
                      )}
                    </div>
                  </span>
                  <div className="flex-shrink-0 ml-2">
                    <MobileItemMenu
                      item={note}
                      itemType="note"
                      isPinned={pinnedNoteIds.has(note.id)}
                      onOpenNote={(note: Note) => onSelectNote(note)}
                      onRenameItem={(id: string, title: string) => onRenameNote(id, title)}
                      onDeleteItem={(id: string) => onDeleteNote(id)}
                      onSetIsMobileSidebarOpen={onSetIsMobileSidebarOpen}
                      onTogglePin={(it) => togglePin(it as Note, 'note')}
                      onMoveItem={handleMobileMove}
                      onEncryptNote={onEncryptNote}
                      onDecryptNote={onDecryptNote}
                    />
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-sidebar-context-menu border-gray-600 text-gray-300 rounded-lg shadow-xl">
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={() => togglePin(note, 'note')}
                >
                  <Star size={16} className="mr-2" />
                  {pinnedNoteIds.has(note.id) ? 'Unpin' : 'Pin'}
                </ContextMenuItem>
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={() => {
                    onSelectNote(note);
                    // Close mobile sidebar when opening note
                    if (isMobileSidebarOpen) {
                      onSetIsMobileSidebarOpen(false);
                    }
                  }}
                >
                  <Edit size={16} className="mr-2" />
                  Open Note
                </ContextMenuItem>
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={() => handleMobileMove(note, 'note')}
                >
                  <Move size={16} className="mr-2" />
                  Move to
                </ContextMenuItem>
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={() => onRenameNote(note.id, note.title)}
                >
                  <Type size={16} className="mr-2" />
                  Rename Note
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-gray-600 mx-1" />
                <ContextMenuItem
                  className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
                  onClick={(e) => e.preventDefault()}
                >
                  <NoteEncryptionDialog
                    noteContent={note.content}
                    isEncrypted={note.isEncrypted || false}
                    encryptedData={note.encryptedData}
                    onEncrypt={(encryptedData) => {
                      onEncryptNote?.(note.id, encryptedData);
                    }}
                    onDecrypt={(decryptedContent) => {
                      onDecryptNote?.(note.id, decryptedContent);
                    }}
                    trigger={
                      <div className="flex items-center w-full">
                        {note.isEncrypted ? (
                          <>
                            <Unlock size={16} className="mr-4" />
                            Decrypt
                          </>
                        ) : (
                          <>
                            <Lock size={16} className="mr-4" />
                            Encrypt
                          </>
                        )}
                      </div>
                    }
                  />
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-gray-600 mx-1" />
                <ContextMenuItem
                  variant="default"
                  className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red- justify-between300 rounded-md mx-1 my-0.5"
                  onClick={() => onDeleteNote(note.id)}
                >
                  <Trash2 size={16} className="mr-2 text-red-400" />
                  Delete Note
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </div>
        ))}
      </div>
    );
  };

  // Get current selected path for FAB
  const currentPath = folders.find(f => f.path === selectedNote?.path)?.path || '';

  const handleSwitchDriveAccount = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('has-synced-drive');
        localStorage.removeItem('has-synced-with-drive');
        localStorage.removeItem('folders-cache');
        localStorage.removeItem('notes-cache');
        localStorage.removeItem('notes-new');
        localStorage.removeItem('folders-new');
      }
      if (onSignOut) {
        await onSignOut();
      }
      if (onSignIn) {
        await onSignIn();
      }
    } catch { }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-gray-900/20 z-40 lg:hidden transition-all duration-300"
          onClick={() => onSetIsMobileSidebarOpen(false)}
        />
      )}

      {/* Floating Sync Progress Indicator for Mobile */}
      {isLoading && (!isMobileSidebarOpen || isSidebarHidden) && (
        <div className="fixed top-16 right-4 z-50 lg:hidden">
          <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-600/50 rounded-lg p-3 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={14} className="text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400 font-medium">Syncing...</span>
              <span className="text-xs text-gray-400">{syncProgress}%</span>
            </div>
            <div className="w-32 bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300 ease-out shadow-sm"
                style={{
                  width: `${syncProgress}%`,
                  boxShadow: syncProgress > 0 ? '0 0 4px rgba(59, 130, 246, 0.6)' : 'none'
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`
            h-full border-r border-gray-600/50 flex flex-col min-h-0 relative z-50 notes-sidebar
            ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}
            lg:relative lg:translate-x-0
            ${isMobileSidebarOpen ? 'fixed left-0 top-0 h-full' : ''}
            ${isSidebarHidden ? 'lg:hidden' : ''}
            shadow-xl
            transition-all duration-300 ease-in-out
            `}
            style={{
              width: `${sidebarWidth}px`
            }}
          >
            <div className="px-6 py-4 border-b border-gray-600/50 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Toggle Button for Desktop */}
                  <button
                    onClick={onToggleSidebar}
                    className={`
                    hidden lg:flex items-center justify-center
                    w-8 h-8 rounded-lg transition-all duration-200 ease-in-out
                    hover:bg-gray-600/60 hover:scale-105 active:scale-95
                    text-gray-400 hover:text-gray-300
                    `}
                    title={isSidebarHidden ? "Show sidebar" : "Hide sidebar"}
                  >
                    {isSidebarHidden ? (
                      <PanelLeftOpen size={16} />
                    ) : (
                      <PanelLeftClose size={16} />
                    )}
                  </button>
                  <h2 className="text-xl font-bold text-white">
                    Notes
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-2xl">
                  {/* Drive Button (Dropdown) */}
                  {isSignedIn ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="
                          flex items-center gap-2 px-2 py-1.5 text-xs font-medium 
                          transition-all duration-200 text-gray-300 hover:text-white 
                          hover:bg-gray-700/60 rounded-2xl"
                        >
                          <Cog size={18} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className='bg-main border-gray-700 text-white'>
                        <DropdownMenuItem onClick={handleSwitchDriveAccount}>
                          Switch Drive account
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className='bg-gray-600' />

                        {onForceSync && (
                          <DropdownMenuItem onClick={onForceSync}>
                            Sync now
                          </DropdownMenuItem>
                        )}
                        {onClearCacheAndSync && (
                          <DropdownMenuItem onClick={onClearCacheAndSync}>
                            Clear cache and sync
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className='bg-gray-600' />

                        {/* Button to refresth the page, similar to F5 */}
                        <DropdownMenuItem
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.location.reload();
                            }
                          }}
                        >
                          Refresh the page
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className='bg-gray-600' />

                        <DropdownMenuItem onClick={onSignOut}>
                          Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <button
                      onClick={onSignIn}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-200 text-gray-400 hover:text-gray-300 hover:bg-gray-700/60 disabled:opacity-50 rounded-2xl"
                      title="Sign in to Google Drive"
                    >
                      <span>
                        {isLoading ? 'Connecting...' : 'Connect to Drive'}
                      </span>
                    </button>
                  )}

                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search notes and folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={`
                      w-full pl-3 py-2.5 text-sm rounded-lg border-none transition-all duration-200
                      bg-transparent backdrop-blur-sm text-white
                      focus:outline-none focus:ring-2
                    `}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Search Results Count */}
                {searchQuery && (
                  <div className="mt-2 text-xs text-gray-400">
                    {debouncedSearchQuery === searchQuery ? (
                      <>Found {filteredData.notes.length} notes, {filteredData.folders.length} folders</>
                    ) : (
                      <>Searching...</>
                    )}
                  </div>
                )}
              </div>

              {!isSignedIn && (
                <div className="text-xs text-yellow-400/80 mt-2 p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                  💡 Sign in to Google Drive to sync notes
                </div>
              )}

              {isLoading && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-400 font-medium">Syncing...</span>
                    <span className="text-xs text-gray-400">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{
                        width: `${syncProgress}%`,
                        boxShadow: syncProgress > 0 ? '0 0 8px rgba(59, 130, 246, 0.6)' : 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Mobile Collapsible Menu */}
              <div className="lg:hidden mt-4 px-2">
                <button
                  onClick={() => setIsMobileMenuExpanded(!isMobileMenuExpanded)}
                  className="w-full flex items-center justify-between py-0.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-lg transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 py-2 px-1">
                    <Menu size={16} className="text-gray-400" />
                    <span>
                      Quick Actions
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${isMobileMenuExpanded ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {/* Collapsible Content */}
                <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                  <a
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-lg transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Home size={16} className="text-blue-400" />
                    <span>
                      Home
                    </span>
                  </a>
                  <button
                    onClick={() => {
                      onSetSelectedPath(currentPath);
                      onSetIsCreatingNote(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 border border-transparent rounded-lg transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FileText size={16} className="text-blue-400" />
                    <span>
                      Create New Note
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      onSetSelectedPath(currentPath);
                      onSetIsCreatingFolder(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 border border-transparent rounded-lg transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FolderPlus size={16} className="text-green-400" />
                    <span>Create New Folder</span>
                  </button>
                </div>
              </div>

              {/* Desktop Home Button */}
              <div className="hidden lg:block mt-4">
                <a
                  href="/"
                  className="flex items-center gap-2 px-1 py-0.5 hover:shadow-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-lg transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className='gap-2 flex py-2 items-center ml-3'>
                    <Home size={16} className="text-blue-400" />
                    <span>Home</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1" style={{ height: 'calc(100vh - 170px)' }}>
              {/* Image and sort section */}
              <div className='flex w-full items-center justify-between mb-4'>
                {/* Images Section */}
                <ImagesSection
                  isSignedIn={isSignedIn}
                  isExpanded={isImagesSectionExpanded}
                  onToggleExpanded={onToggleImagesSection}
                />

                {/* Sort control */}
                <div className="px-4 pb-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ArrowUpDown size={16} className="text-gray-400 cursor-pointer hover:text-white transition-colors duration-200" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="start" className="bg-main border-gray-700 text-white">
                      <DropdownMenuLabel className={`${isTimeSorting ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                        Folders
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={folderSort}
                        onValueChange={(v) => {
                          if (!isTimeSorting) setFolderSort(v as FolderSort);
                        }}
                        className={isTimeSorting ? 'opacity-50 pointer-events-none select-none' : ''}
                      >
                        <DropdownMenuRadioItem value="az">A → Z</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="za">Z → A</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>

                      <DropdownMenuSeparator className="bg-gray-600" />

                      <DropdownMenuLabel className={`${isTimeSorting ? 'opacity-50 pointer-events-none select-none' : ''}`}>
                        Files
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={fileSort}
                        onValueChange={(v) => {
                          if (!isTimeSorting) setFileSort(v as FileSort);
                        }}
                        className={isTimeSorting ? 'opacity-50 pointer-events-none select-none' : ''}
                      >
                        <DropdownMenuRadioItem value="az">A → Z</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="za">Z → A</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator className="bg-gray-600" />

                      <DropdownMenuLabel>Time</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={timeSort}
                        onValueChange={(v) => setTimeSort(v as TimeSort)}
                      >
                        <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>

                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>


              {/* File Tree */}
              {renderFileTree()}
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 bg-sidebar-context-menu border-gray-600 text-gray-300 rounded-lg shadow-xl">
          <ContextMenuItem
            className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
            onClick={() => {
              onSetSelectedPath('');
              onSetIsCreatingFolder(true);
            }}
          >
            <FolderPlus size={16} className="mr-2" />
            New Folder
          </ContextMenuItem>
          <ContextMenuItem
            className={`hover:bg-transparent hover:text-white ${notesTheme === 'light' ? 'text-black' : ''} rounded-md mx-1 my-0.5`}
            onClick={() => {
              onSetSelectedPath('');
              onSetIsCreatingNote(true);
            }}
          >
            <FileText size={16} className="mr-2" />
            New Note
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Move Drawer */}
      <MoveDrawer
        isOpen={isMoveDialogOpen}
        item={moveItem?.item || null}
        itemType={moveItem?.type || 'note'}
        folders={folders}
        onClose={() => {
          setIsMoveDialogOpen(false);
          setMoveItem(null);
        }}
        onMove={handleMoveConfirm}
      />
    </>
  );
}
