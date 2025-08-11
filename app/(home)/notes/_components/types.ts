export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  driveFileId?: string;
  createdAt: string;
  updatedAt: string;
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
  onDrop: (e: React.DragEvent, targetFolderId: string) => void;
  onSetDragOver: (dragOver: string | null) => void;
  onSetIsResizing: (isResizing: boolean) => void;
  onSetIsMobileSidebarOpen: (isOpen: boolean) => void;
  onToggleSidebar: () => void;
  onToggleImagesSection: () => void;
  onForceSync?: () => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}
