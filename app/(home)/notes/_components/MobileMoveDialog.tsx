'use client';

import { useState, useEffect } from 'react';
import { X, Folder as FolderIcon, Home, ChevronRight } from 'lucide-react';
import { Note, Folder } from './types';

interface MobileMoveDialogProps {
  isOpen: boolean;
  item: Note | Folder | null;
  itemType: 'note' | 'folder';
  folders: Folder[];
  onClose: () => void;
  onMove: (targetFolderId: string) => void;
}

export default function MobileMoveDialog({
  isOpen,
  item,
  itemType,
  folders,
  onClose,
  onMove
}: MobileMoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(null);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  // Filter folders to show only valid move destinations
  const getValidDestinations = () => {
    if (itemType === 'note') {
      // Notes can be moved to any folder
      return folders;
    } else {
      // Folders cannot be moved to themselves or their descendants
      const folder = item as Folder;
      return folders.filter(f => {
        // Can't move to itself
        if (f.id === folder.id) return false;
        // Can't move to its own descendants
        if (f.path.startsWith(folder.path + '/')) return false;
        return true;
      });
    }
  };

  const validFolders = getValidDestinations();

  const handleMove = () => {
    if (selectedFolderId) {
      onMove(selectedFolderId);
      onClose();
    }
  };

  const getFolderDisplayName = (folder: Folder) => {
    if (folder.id === 'root') return 'Root';
    return folder.name;
  };

  const getFolderPath = (folder: Folder) => {
    if (folder.id === 'root') return '/';
    return folder.path || '/';
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#31363F] border-t border-gray-600 rounded-t-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h3 className="text-lg font-semibold text-white">
            Move {itemType === 'note' ? 'Note' : 'Folder'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

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
              <p className="text-sm text-gray-400">
                Current: {item.path || 'Root'}
              </p>
            </div>
          </div>
        </div>

        {/* Destination Selection */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <p className="text-sm text-gray-400 mb-3">Select destination folder:</p>
            <div className="space-y-2">
              {validFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                    selectedFolderId === folder.id
                      ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                      : 'bg-gray-700/30 border border-transparent text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {folder.id === 'root' ? (
                      <Home size={18} className="text-blue-400" />
                    ) : (
                      <FolderIcon size={18} className="text-blue-400" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">{getFolderDisplayName(folder)}</p>
                      <p className="text-xs opacity-70">{getFolderPath(folder)}</p>
                    </div>
                  </div>
                  {selectedFolderId === folder.id && (
                    <ChevronRight size={16} className="text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-300 bg-gray-700/50 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedFolderId}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedFolderId
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
}