'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderOpen, FileText, FolderPlus, Trash2, Cloud, CloudOff, Edit, Type, RefreshCw, PanelLeftClose, PanelLeftOpen, Home, Menu, Cog, ArrowUpDown } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { NoteSidebarProps, Note, Folder } from './types';
import { MobileItemMenu } from './MobileFileOperations';
import MobileMoveDialog from './MobileMoveDialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NoteSidebar({
  notes,
  folders,
  selectedNote,
  isSignedIn,
  isLoading,
  syncProgress,
  sidebarWidth,
  dragOver,
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
  onDragOver,
  onDragLeave,
  onDrop,
  onSetDragOver,
  onSetIsResizing,
  onSetIsMobileSidebarOpen,
  onToggleSidebar,
  onToggleImagesSection,
  onForceSync,
  onClearCacheAndSync,
  onSignIn,
  onSignOut
}: NoteSidebarProps) {

  // Add state for mobile menu collapsible
  const [isMobileMenuExpanded, setIsMobileMenuExpanded] = useState(false);


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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-sort-folder', folderSort);
      localStorage.setItem('sidebar-sort-file', fileSort);
      localStorage.setItem('sidebar-sort-time', timeSort);
    }
  }, [folderSort, fileSort, timeSort]);

  const getNotesInPath = (path: string) => {
    return notes.filter(note => note.path === path);
  };

  const getSubfolders = (parentPath: string) => {
    return folders.filter(folder => {
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
    const subfolders = getSubfolders(parentPath);
    const notesInPath = getNotesInPath(parentPath);

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

    return (
      <div className={level > 0 ? 'ml-3' : ''}>
        {/* Render subfolders */}
        {sortedSubfolders.map(folder => (
          <div key={folder.id} className="mb-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={`
                    flex items-center py-2.5 rounded-lg cursor-pointer group 
                    transition-all duration-200 ease-in-out
                    hover:bg-gray-700/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
                    ${dragOver === folder.id ? 'bg-blue-600/40 shadow-lg ring-2 ring-blue-500/50' : ''}
                    ${level > 0 ? 'ml-2' : ''}
                  `}
                  draggable={folder.id !== 'root'}
                  onDragStart={(e) => onDragStart(e, 'folder', folder.id)}
                  onDragOver={(e) => onDragOver(e, folder.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, folder.id)}
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
                    className="text-gray-300 text-sm flex-1 truncate font-medium min-w-0"
                    title={folder.name}
                  >
                    {folder.name}
                  </span>
                  <div className="flex-shrink-0 ml-2">
                    <MobileItemMenu
                      item={folder}
                      itemType="folder"
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
                      onMoveItem={handleMobileMove}
                    />
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300 rounded-lg shadow-xl">
                <ContextMenuItem
                  className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md mx-1 my-0.5"
                  onClick={() => {
                    onSetSelectedPath(folder.path);
                    onSetIsCreatingFolder(true);
                  }}
                >
                  <FolderPlus size={16} className="mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuItem
                  className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md mx-1 my-0.5"
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
                    <ContextMenuSeparator className="bg-gray-600 mx-1" />
                    <ContextMenuItem
                      className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md mx-1 my-0.5"
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
            {folder.expanded && renderFileTree(folder.path, level + 1)}
          </div>
        ))}

        {/* Render notes */}
        {sortedNotes.map(note => (
          <div key={note.id} className="mb-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={`
flex items-center py-2 rounded-lg cursor-pointer group transition-all duration-200 ease-in-out
hover:bg-gray-700/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
${selectedNote?.id === note.id ? 'bg-gray-700/80 shadow-lg ring-1 ring-gray-500/30' : ''}
${level > 0 ? 'ml-2' : ''}
`}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'note', note.id)}
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
                    className="text-gray-300 text-sm flex-1 truncate min-w-0"
                    title={note.title}
                  >
                    {note.title}
                  </span>
                  <div className="flex-shrink-0 ml-2">
                    <MobileItemMenu
                      item={note}
                      itemType="note"
                      onOpenNote={(note: Note) => onSelectNote(note)}
                      onRenameItem={(id: string, title: string) => onRenameNote(id, title)}
                      onDeleteItem={(id: string) => onDeleteNote(id)}
                      onSetIsMobileSidebarOpen={onSetIsMobileSidebarOpen}
                      onMoveItem={handleMobileMove}
                    />
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300 rounded-lg shadow-xl">
                <ContextMenuItem
                  className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md mx-1 my-0.5"
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
                  className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md mx-1 my-0.5"
                  onClick={() => onRenameNote(note.id, note.title)}
                >
                  <Type size={16} className="mr-2" />
                  Rename Note
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-gray-600 mx-1" />
                <ContextMenuItem
                  variant="default"
                  className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300 rounded-md mx-1 my-0.5"
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

  // Mobile move dialog state
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<{ item: Note | Folder; type: 'note' | 'folder' } | null>(null);

  // Handle mobile move operations
  const handleMobileMove = (item: Note | Folder, type: 'note' | 'folder') => {
    setMoveItem({ item, type });
    setIsMoveDialogOpen(true);
  };

  const handleMoveConfirm = (targetFolderId: string) => {
    if (!moveItem) return;

    // Set the dragged item state first
    const mockDraggedItem = { type: moveItem.type, id: moveItem.item.id };
    onDragStart({} as React.DragEvent, moveItem.type, moveItem.item.id);

    // Then trigger the drop with the target folder
    onDrop({} as React.DragEvent, targetFolderId);

    setMoveItem(null);
    setIsMoveDialogOpen(false);
  };

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
      {isLoading && !isMobileSidebarOpen && (
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
border-r border-gray-600/50 flex flex-col overflow-hidden relative z-50
${dragOver === 'root' ? 'bg-blue-600/10' : ''}
${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}
lg:relative lg:translate-x-0
${isMobileSidebarOpen ? 'fixed left-0 top-0 h-full' : ''}
${isSidebarHidden ? 'lg:hidden' : ''}
shadow-xl
transition-all duration-300 ease-in-out
`}
            style={{
              width: `${sidebarWidth}px`,
              backgroundColor: dragOver === 'root' ? '#1e40af10' : '#31363F'
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

            <div className="flex-1 overflow-y-auto p-4 space-y-1"
              onDragOver={(e) => {
                e.preventDefault();
                // Only set to root if we're not over a specific folder
                if (e.target === e.currentTarget) {
                  onSetDragOver('root');
                }
              }}
              onDragLeave={(e) => {
                // Only clear if we're leaving the container itself
                if (e.target === e.currentTarget) {
                  onSetDragOver(null);
                }
              }}
              onDrop={(e) => {
                // Only handle drop to root if we're dropping on empty space
                if (e.target === e.currentTarget) {
                  onDrop(e, 'root');
                }
              }}
            >

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
        <ContextMenuContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300 rounded-lg shadow-xl">
          <ContextMenuItem
            className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md mx-1 my-0.5"
            onClick={() => {
              onSetSelectedPath('');
              onSetIsCreatingFolder(true);
            }}
          >
            <FolderPlus size={16} className="mr-2" />
            New Folder
          </ContextMenuItem>
          <ContextMenuItem
            className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md mx-1 my-0.5"
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

      {/* Mobile Move Dialog */}
      <MobileMoveDialog
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
