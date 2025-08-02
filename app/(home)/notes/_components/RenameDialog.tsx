'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RenameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  currentName: string;
  type: 'file' | 'folder';
}

export default function RenameDialog({
  isOpen,
  onClose,
  onConfirm,
  currentName,
  type
}: RenameDialogProps) {
  const [newName, setNewName] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setError('');
    }
  }, [isOpen, currentName]);

  const handleConfirm = () => {
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      setError(`${type === 'file' ? 'Note title' : 'Folder name'} cannot be empty`);
      return;
    }

    if (trimmedName === currentName) {
      onClose();
      return;
    }

    onConfirm(trimmedName);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#31363F] border-gray-600 text-gray-300">
        <DialogHeader>
          <DialogTitle className="text-white">
            Rename {type === 'file' ? 'Note' : 'Folder'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-input" className="text-gray-300">
              {type === 'file' ? 'Note Title' : 'Folder Name'}
            </Label>
            <Input
              id="rename-input"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              className="bg-gray-700 border-none text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
              placeholder={`Enter new ${type === 'file' ? 'note title' : 'folder name'}`}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-main cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-primary hover:bg-primary/60 text-white cursor-pointer"
            disabled={!newName.trim() || newName.trim() === currentName}
          >
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 