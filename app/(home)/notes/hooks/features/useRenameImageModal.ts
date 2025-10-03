'use client';

import { useCallback, useState } from 'react';

/**
 * Shared rename-image modal flow for both editors.
 * Provides a Promise-based opener and the dialog props to render.
 */
export interface UseRenameImageModalResult {
  renameModal: { open: boolean; defaultName: string } | null;
  setRenameModal: React.Dispatch<React.SetStateAction<{ open: boolean; defaultName: string } | null>>;
  openRenameModal: (defaultFilename: string) => Promise<string | null>;
  dialogProps: {
    isOpen: boolean;
    defaultName: string;
    onConfirm: (newName: string | null) => void;
    onOpenChange: (open: boolean) => void;
  };
}

export function useRenameImageModal(windowKey: string): UseRenameImageModalResult {
  const [renameModal, setRenameModal] = useState<{ open: boolean; defaultName: string } | null>(null);

  const openRenameModal = useCallback((defaultFilename: string) => {
    return new Promise<string | null>((resolve) => {
      setRenameModal({ open: true, defaultName: defaultFilename });
      (window as any)[windowKey] = (newName: string | null) => {
        setRenameModal(null);
        resolve(newName);
      };
    });
  }, [windowKey]);

  const dialogProps = {
    isOpen: renameModal?.open || false,
    defaultName: renameModal?.defaultName || '',
    onConfirm: (newName: string | null) => {
      const cb = (window as any)[windowKey] as (n: string | null) => void;
      if (cb) cb(newName);
    },
    onOpenChange: (open: boolean) => {
      if (!open) {
        const cb = (window as any)[windowKey] as (n: string | null) => void;
        if (cb) cb(null);
      }
    }
  };

  return { renameModal, setRenameModal, openRenameModal, dialogProps };
}