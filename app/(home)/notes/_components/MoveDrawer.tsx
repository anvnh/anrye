'use client';

import { useMemo, useState, useEffect } from 'react';
import { Folder as FolderIcon, Home, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { Note, Folder } from './types';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

interface MoveDrawerProps {
  isOpen: boolean;
  item: Note | Folder | null;
  itemType: 'note' | 'folder';
  folders: Folder[];
  onClose: () => void;
  onMove: (targetFolderId: string, newTitle?: string) => void;
}

export default function MoveDrawer({
  isOpen,
  item,
  itemType,
  folders,
  onClose,
  onMove,
}: MoveDrawerProps) {
  const [query, setQuery] = useState('');
  const [currentPath, setCurrentPath] = useState<string>(''); // '' represents Root
  const [proposedTitle, setProposedTitle] = useState<string>(
    itemType === 'note' && item ? (item as Note).title : ''
  );

  useEffect(() => {
    if (isOpen) {
      // reset to current folder of the item
      setQuery('');
      const basePath = item?.path || '';
      setCurrentPath(basePath);
      // set proposed title for notes when opening
      setProposedTitle(itemType === 'note' && item ? (item as Note).title : '');
    }
  }, [isOpen]);

  // Do not early-return before hooks; keep hooks order stable across renders

  // Determine valid destination folders (global validity)
  const validFoldersGlobal = useMemo(() => {
    if (itemType === 'note') return folders;
    const folder = (item as Folder | null) || null;
    if (!folder) return folders;
    const basePath = folder.path || '';
    return folders.filter(
      (f) => f.id !== folder.id && !(basePath && f.path.startsWith(basePath + '/'))
    );
  }, [folders, item, itemType]);

  // Compute folder level listing based on currentPath (step-by-step navigation)
  const levelFolders = useMemo(() => {
    // Root level: parentId === 'root' and id !== 'root'
    if (!currentPath) {
      return validFoldersGlobal.filter((f) => f.parentId === 'root' && f.id !== 'root');
    }
    // List immediate children of currentPath
    const prefix = currentPath + '/';
    const depth = currentPath.split('/').filter(Boolean).length + 1;
    return validFoldersGlobal.filter((f) => f.path.startsWith(prefix) && f.path.split('/').length === depth);
  }, [validFoldersGlobal, currentPath]);

  // Apply search query to current level
  const displayedFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return levelFolders;
    // Global search across all folders
    return validFoldersGlobal.filter((f) => f.name.toLowerCase().includes(q));
  }, [levelFolders, query, validFoldersGlobal]);

  const handleMove = () => {
    const target = !currentPath ? 'root' : folders.find((f) => f.path === currentPath)?.id;
    if (target) {
      onMove(target, itemType === 'note' ? proposedTitle?.trim() || undefined : undefined);
      onClose();
    }
  };

  const getFolderDisplayName = (folder: Folder) => (folder.id === 'root' ? 'Root' : folder.name);
  const getFolderPath = (folder: Folder) => (folder.id === 'root' ? '/' : folder.path || '/');

  const canGoUp = !!currentPath;
  const parentPath = useMemo(() => {
    if (!currentPath) return '';
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  }, [currentPath]);

  // Safe early return after all hooks are declared
  if (!item) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} direction="bottom">
      <DrawerContent className="bg-[#31363F] border-t border-gray-600 rounded-t-xl max-h-[80vh] flex flex-col">
        <DrawerHeader className="border-b border-gray-600">
          <DrawerTitle className="text-white">
            Move {itemType === 'note' ? 'Note' : 'Folder'}
          </DrawerTitle>
        </DrawerHeader>

        {/* Item Info */}
        <div className="p-4 border-b border-gray-600">
          <div className="flex items-center gap-3">
            {itemType === 'folder' ? (
              <FolderIcon size={20} className="text-blue-400" />
            ) : (
              <div className="w-5 h-5 rounded border border-gray-500 bg-gray-700" />
            )}
            <div>
              <p className="text-white font-medium">
                {itemType === 'folder' ? (item as Folder).name : (item as Note).title}
              </p>
              <p className="text-sm text-gray-400">Current: {item.path || 'Root'}</p>
            </div>
          </div>
          {itemType === 'note' && (
            <div className="mt-3">
              <label className="text-xs text-gray-400 mb-1 block">New title (optional)</label>
              <input
                value={proposedTitle}
                onChange={(e) => setProposedTitle(e.target.value)}
                className="w-full px-3 py-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Keep current title"
                style={{ backgroundColor: '#222831' }}
              />
            </div>
          )}
        </div>

        {/* Destination Selection */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search folders"
                className="w-full pl-8 pr-3 py-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: '#222831' }}
              />
            </div>

            {/* Breadcrumb / path controls */}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <button
                className={`${canGoUp ? 'hover:bg-gray-700/60' : 'opacity-50 cursor-not-allowed'} px-2 py-1 rounded`}
                onClick={() => canGoUp && setCurrentPath(parentPath)}
                disabled={!canGoUp}
                title="Up one level"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="truncate">{currentPath ? `/${currentPath}` : '/ (Root)'}</span>
            </div>

            {/* Current level folders */}
            <div className="space-y-2">
              {/* Root selectable row */}
              {!currentPath && !query && (
                <button
                  key="root"
                  onClick={() => setCurrentPath('')}
                  className={"w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 bg-gray-700/30 border border-transparent text-gray-300 hover:bg-gray-700/50 hover:text-white"}
                >
                  <div className="flex items-center gap-3">
                    <Home size={18} className="text-blue-400" />
                    <div className="text-left">
                      <p className="font-medium">Root</p>
                      <p className="text-xs opacity-70">/</p>
                    </div>
                  </div>
                </button>
              )}

              {displayedFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    setCurrentPath(folder.path);
                    // When searching, clear query after jumping in
                    if (query) setQuery('');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <FolderIcon size={18} className="text-blue-400" />
                    <div className="text-left">
                      <p className="font-medium">{folder.name}</p>
                      <p className="text-xs opacity-70 truncate">/{folder.path}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t border-gray-600 flex gap-3">
          <DrawerClose asChild>
            <button className="flex-1 px-4 py-2 text-gray-300 bg-gray-700/50 rounded-lg font-medium hover:bg-gray-700 transition-colors">
              Cancel
            </button>
          </DrawerClose>
          <button
            onClick={handleMove}
            disabled={false}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              true
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            Move Here
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
