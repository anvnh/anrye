'use client';

import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderOpen, FileText, FolderPlus, Trash2, Cloud, CloudOff, Edit, Type, RefreshCw, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { NoteSidebarProps } from './types';

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
  onForceSync,
  onSignIn,
  onSignOut
}: NoteSidebarProps) {

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

  const renderFileTree = (parentPath: string = '', level: number = 0) => {
    const subfolders = getSubfolders(parentPath);
    const notesInPath = getNotesInPath(parentPath);

    return (
      <div className={level > 0 ? 'ml-3' : ''}>
        {/* Render subfolders */}
        {subfolders.map(folder => (
          <div key={folder.id} className="mb-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={`
                    flex items-center px-3 py-2 rounded-lg cursor-pointer group transition-all duration-200 ease-in-out
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
                    className="text-gray-300 text-sm flex-1 truncate font-medium"
                    style={{ maxWidth: 'calc(100% - 50px)', display: 'inline-block', verticalAlign: 'middle' }}
                    title={folder.name}
                  >
                    {folder.name}
                  </span>
                  {folder.driveFolderId && (
                    <Cloud size={12} className="text-green-400 mr-1 opacity-80" />
                  )}
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
        {notesInPath.map(note => (
          <div key={note.id} className="mb-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className={`
                    flex items-center px-3 py-2 rounded-lg cursor-pointer group transition-all duration-200 ease-in-out
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
                    className="text-gray-300 text-sm flex-1 truncate"
                    style={{ maxWidth: 'calc(100% - 50px)', display: 'inline-block', verticalAlign: 'middle' }}
                    title={note.title}
                  >
                    {note.title}
                  </span>
                  {note.driveFileId && (
                    <Cloud size={12} className="text-green-400 mr-1 opacity-80" />
                  )}
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
                  {/* Drive Button */}
                  {isSignedIn ? (
                    <button
                      onClick={onSignOut}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-200 text-green-400 hover:text-green-300 hover:bg-gray-700/60 rounded-2xl"
                      title="Signed in to Google Drive - Click to sign out"
                    >
                      <Cloud size={12} />
                      <span>Drive</span>
                    </button>
                  ) : (
                    <button
                      onClick={onSignIn}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-200 text-gray-400 hover:text-gray-300 hover:bg-gray-700/60 disabled:opacity-50 rounded-2xl"
                      title="Sign in to Google Drive"
                    >
                      <CloudOff size={12} />
                      <span>
                        {isLoading ? 'Connecting...' : 'Drive'}
                      </span>
                    </button>
                  )}

                  {/* Sync Button */}
                  {isSignedIn && onForceSync && (
                    <button
                      onClick={onForceSync}
                      disabled={isLoading}
                      className={`
                    flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-200
                    ${isLoading
                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 rounded-2xl'
                      }
                  `}
                      title="Sync with Google Drive"
                    >
                      <RefreshCw
                        size={12}
                        className={`${isLoading ? 'animate-spin' : ''}`}
                      />
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
    </>
  );
}
