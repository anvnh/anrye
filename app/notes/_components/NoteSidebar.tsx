'use client';

import { ChevronDown, ChevronRight, Folder as FolderIcon, FolderOpen, FileText, FolderPlus, Trash2, Cloud, Edit } from 'lucide-react';
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
  // isResizing, // Currently unused but kept for future feature
  onToggleFolder,
  onSelectNote,
  onSetSelectedPath,
  onSetIsCreatingFolder,
  onSetIsCreatingNote,
  onDeleteFolder,
  onDeleteNote,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onSetDragOver,
  onSetIsResizing
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
      <div className={level > 0 ? 'ml-4' : ''}>
        {/* Render subfolders */}
        {subfolders.map(folder => (
          <div key={folder.id} className="mb-1">
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div 
                  className={`flex items-center px-2 py-1 hover:bg-gray-700 rounded cursor-pointer group ${
                    dragOver === folder.id ? 'bg-blue-600 bg-opacity-30' : ''
                  }`}
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
                    <ChevronDown size={16} className="text-gray-400 mr-1" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400 mr-1" />
                  )}
                  {folder.expanded ? (
                    <FolderOpen size={16} className="text-blue-400 mr-2" />
                  ) : (
                    <FolderIcon size={16} className="text-blue-400 mr-2" />
                  )}
                  <span className="text-gray-300 text-sm flex-1">{folder.name}</span>
                  {folder.driveFolderId && (
                    <Cloud size={12} className="text-green-400 mr-1" />
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300">
                <ContextMenuItem 
                  className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                  onClick={() => {
                    onSetSelectedPath(folder.path);
                    onSetIsCreatingFolder(true);
                  }}
                >
                  <FolderPlus size={16} className="mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuItem 
                  className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
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
                    <ContextMenuSeparator className="bg-gray-600" />
                    <ContextMenuItem 
                      variant="destructive"
                      className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300"
                      onClick={() => onDeleteFolder(folder.id)}
                    >
                      <Trash2 size={16} className="mr-2" />
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
                  className={`flex items-center px-2 py-1 hover:bg-gray-700 rounded cursor-pointer group ${
                    selectedNote?.id === note.id ? 'bg-gray-700' : ''
                  }`}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'note', note.id)}
                  onClick={() => onSelectNote(note)}
                >
                  <div className="w-4 mr-1"></div>
                  <FileText size={16} className="text-gray-400 mr-2" />
                  <span className="text-gray-300 text-sm flex-1 truncate">{note.title}</span>
                  {note.driveFileId && (
                    <Cloud size={12} className="text-green-400 mr-1" />
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300">
                <ContextMenuItem 
                  className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                  onClick={() => onSelectNote(note)}
                >
                  <Edit size={16} className="mr-2" />
                  Open Note
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-gray-600" />
                <ContextMenuItem 
                  variant="destructive"
                  className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300"
                  onClick={() => onDeleteNote(note.id)}
                >
                  <Trash2 size={16} className="mr-2" />
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className={`border-r border-gray-600 flex flex-col overflow-hidden relative ${
            dragOver === 'root' ? 'bg-blue-600 bg-opacity-10' : ''
          }`}
          style={{ 
            width: `${sidebarWidth}px`,
            backgroundColor: dragOver === 'root' ? '#1e40af20' : '#31363F' 
          }}
        >
          <div className="px-4 py-3 border-b border-gray-600 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">
              Notes
            </h2>
            
            {!isSignedIn && (
              <div className="text-xs text-yellow-400 mt-2">
                💡 Sign in to Google Drive to sync notes
              </div>
            )}
            
            {isLoading && (
              <div className="text-xs text-blue-400 mt-2">
                Syncing {syncProgress}%...
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4"
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
          
          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors"
            onMouseDown={() => onSetIsResizing(true)}
            title="Drag to resize sidebar"
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-[#31363F] border-gray-600 text-gray-300">
        <ContextMenuItem 
          className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
          onClick={() => {
            onSetSelectedPath('');
            onSetIsCreatingFolder(true);
          }}
        >
          <FolderPlus size={16} className="mr-2" />
          New Folder
        </ContextMenuItem>
        <ContextMenuItem 
          className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
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
  );
}
