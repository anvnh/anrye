export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  driveFileId?: string;
  createdAt: string;
  updatedAt: string;
  isEncrypted?: boolean;
  encryptedData?: {
    data: string;
    iv: string;
    salt: string;
    tag: string;
    algorithm: string;
    iterations: number;
  };
}

export interface Folder {
  id: string;
  name: string;
  path: string;
  parentId: string;
  driveFolderId?: string;
  expanded: boolean;
}

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

export type DraggedItem = {
  type: 'note' | 'folder';
  id: string;
} | null;

export interface NoteSidebarProps {
  notes: Note[];
  folders: Folder[];
  selectedNote: Note | null;
  isSignedIn: boolean;
  isLoading: boolean;
  syncProgress: number;
  sidebarWidth: number;
  dragOver: string | null;
  isResizing: boolean;
  isMobileSidebarOpen: boolean;
  isSidebarHidden: boolean;
  isImagesSectionExpanded: boolean;
  onToggleFolder: (folderId: string) => void;
  onSelectNote: (note: Note) => void;
  onSetSelectedPath: (path: string) => void;
  onSetIsCreatingFolder: (creating: boolean) => void;
  onSetIsCreatingNote: (creating: boolean) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onRenameNote: (noteId: string, newName: string) => void;
  onDragStart: (e: React.DragEvent, type: 'note' | 'folder', id: string) => void;
  onDragOver: (e: React.DragEvent, targetId: string) => void;
  onDragLeave: () => void;
  onDrop: (
    e: React.DragEvent,
    targetFolderId: string,
    dragged?: { type: 'note' | 'folder'; id: string } | null,
    newTitle?: string
  ) => void;
  onSetDragOver: (dragOver: string | null) => void;
  onSetDraggedItem: (item: { type: 'note' | 'folder'; id: string } | null) => void;
  onSetIsResizing: (isResizing: boolean) => void;
  onSetIsMobileSidebarOpen: (isOpen: boolean) => void;
  onToggleSidebar: () => void;
  onToggleImagesSection: () => void;
  onForceSync?: () => void;
  onClearCacheAndSync?: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onEncryptNote?: (noteId: string, encryptedData: any) => void;
  onDecryptNote?: (noteId: string, decryptedContent: string) => void;
  notesTheme: 'light' | 'dark';
}
