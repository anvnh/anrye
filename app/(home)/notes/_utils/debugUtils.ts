export const clearAllData = (
  setNotes: (notes: any[]) => void,
  setFolders: (folders: any[]) => void,
  setSelectedNote: (note: any) => void,
  setHasSyncedWithDrive: (synced: boolean) => void,
  setIsSidebarHidden: (hidden: boolean) => void
) => {
  localStorage.removeItem('notes-new');
  localStorage.removeItem('folders-new');
  localStorage.removeItem('has-synced-drive');
  localStorage.removeItem('sidebar-width');
  localStorage.removeItem('sidebar-hidden');
  localStorage.removeItem('selected-note-id');
  setNotes([]);
  setFolders([{ id: 'root', name: 'Notes', path: '', parentId: '', expanded: true }]);
  setSelectedNote(null);
  setHasSyncedWithDrive(false);
  setIsSidebarHidden(false);
};

export const setupDebugUtils = (clearAllDataFn: () => void) => {
  // Add to window for debugging (remove in production)
  if (typeof window !== 'undefined') {
    (window as unknown as { clearAllData: () => void }).clearAllData = clearAllDataFn;
  }
}; 