'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface RenameImageDialogProps {
  isOpen: boolean;
  defaultName: string;
  onConfirm: (newName: string | null) => void; // null => keep default
  onOpenChange?: (open: boolean) => void;
}

const RenameImageDialog: React.FC<RenameImageDialogProps> = ({
  isOpen,
  defaultName,
  onConfirm,
  onOpenChange
}) => {
  const [name, setName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName.replace(/\.[^/.]+$/, '')); // show without extension
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, defaultName]);

  const extension = defaultName.split('.').pop() || 'png';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#31363F', borderColor: '#4a5568' }}>
        <DialogHeader>
          <DialogTitle className="text-white">Name your image</DialogTitle>
          <DialogDescription className="text-gray-400">
            You can rename the image before uploading. If you skip, the default name will be used.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Image name"
              className="flex-1 px-3 py-2 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#222831' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(name || null);
              }}
            />
            <span className="text-gray-400 text-sm">.{extension}</span>
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onConfirm(null)}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Use default
          </button>
          <button
            onClick={() => onConfirm(name || null)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameImageDialog;