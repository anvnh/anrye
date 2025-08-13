'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, FolderPlus, FileText, Edit, Trash2, Plus, X, Move, Star } from 'lucide-react';
import { Note, Folder } from './types';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface MobileFileOperationsProps {
  // Item-specific operations
  item?: Note | Folder;
  itemType?: 'note' | 'folder';

  // Global operations
  isGlobalFAB?: boolean;
  selectedPath?: string;

  // Callbacks
  onCreateFolder?: (path: string) => void;
  onCreateNote?: (path: string) => void;
  onRenameItem?: (id: string, name: string) => void;
  onDeleteItem?: (id: string) => void;
  onOpenNote?: (note: Note) => void;
  onSetIsMobileSidebarOpen?: (isOpen: boolean) => void;
  onMoveItem?: (item: Note | Folder, itemType: 'note' | 'folder') => void;
  isPinned?: boolean;
  onTogglePin?: (item: Note | Folder, itemType: 'note' | 'folder') => void;
}

// Three-dot menu for individual items using Radix UI DropdownMenu
export function MobileItemMenu({
  item,
  itemType,
  onCreateFolder,
  onCreateNote,
  onRenameItem,
  onDeleteItem,
  onOpenNote,
  onSetIsMobileSidebarOpen,
  onMoveItem,
  isPinned,
  onTogglePin
}: MobileFileOperationsProps) {
  if (!item) return null;

  return (
    <div className="lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 opacity-100 flex-shrink-0"
            aria-label="More options"
          >
            <MoreVertical size={16} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-48 bg-[#31363F] border-gray-600 text-gray-300 rounded-lg shadow-xl"
          side="bottom"
          align="end"
        >
          {itemType === 'folder' && (
            <>
              <DropdownMenuItem
                className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                onClick={() => onCreateFolder?.(item.path || '')}
              >
                <FolderPlus size={16} className="mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                onClick={() => onCreateNote?.(item.path || '')}
              >
                <FileText size={16} className="mr-2" />
                New Note
              </DropdownMenuItem>
              {(item as Folder).id !== 'root' && (
                <>
                  <DropdownMenuSeparator className="bg-gray-600" />
                  <DropdownMenuItem
                    className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                    onClick={() => onTogglePin?.(item, 'folder')}
                  >
                    <Star size={16} className="mr-2" />
                    {isPinned ? 'Unpin' : 'Pin'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                    onClick={() => onRenameItem?.(item.id, (item as Folder).name)}
                  >
                    <Edit size={16} className="mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                    onClick={() => onMoveItem?.(item, 'folder')}
                  >
                    <Move size={16} className="mr-2" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300"
                    onClick={() => onDeleteItem?.(item.id)}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}

          {itemType === 'note' && (
            <>
              <DropdownMenuItem
                className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                onClick={() => {
                  onOpenNote?.(item as Note);
                  onSetIsMobileSidebarOpen?.(false);
                }}
              >
                <Edit size={16} className="mr-2" />
                Open Note
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                onClick={() => onTogglePin?.(item, 'note')}
              >
                <Star size={16} className="mr-2" />
                {isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                onClick={() => onRenameItem?.(item.id, (item as Note).title)}
              >
                <Edit size={16} className="mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white"
                onClick={() => onMoveItem?.(item, 'note')}
              >
                <Move size={16} className="mr-2" />
                Move
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-600" />
              <DropdownMenuItem
                variant="destructive"
                className="text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300"
                onClick={() => onDeleteItem?.(item.id)}
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Floating Action Button for creating new items
export function MobileFAB({
  selectedPath = '',
  onCreateFolder,
  onCreateNote
}: MobileFileOperationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 lg:hidden" ref={fabRef}>
      {/* Action buttons */}
      <div className={`flex flex-col gap-3 mb-3 transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
        <button
          onClick={() => handleAction(() => onCreateNote?.(selectedPath))}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="New Note"
        >
          <FileText size={20} />
        </button>
        <button
          onClick={() => handleAction(() => onCreateFolder?.(selectedPath))}
          className="w-12 h-12 bg-green-600 hover:bg-green-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="New Folder"
        >
          <FolderPlus size={20} />
        </button>
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'
          }`}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  );
}

// Combined export for convenience
export default function MobileFileOperations(props: MobileFileOperationsProps) {
  if (props.isGlobalFAB) {
    return <MobileFAB {...props} />;
  }
  return <MobileItemMenu {...props} />;
}
