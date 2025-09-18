import { useCallback } from 'react';
import { useDrive } from '../../../lib/driveContext';
import { driveService } from '../../../lib/googleDrive';
import { Note, Folder } from '../components/types';
import { createNoteTemplate } from '../utils/noteTemplate';

export const useNoteOperations = (
  notes: Note[],
  setNotes: (notes: Note[]) => void,
  folders: Folder[],
  selectedNote: Note | null,
  setSelectedNote: (note: Note | null) => void,
  selectedPath: string,
  editContent: string,
  editTitle: string,
  setIsLoading: (loading: boolean) => void,
  setSyncProgress: (progress: number) => void,
  setIsEditing: (editing: boolean) => void,
  setIsSplitMode: (split: boolean) => void,
  setEditContent: (content: string) => void,
  setEditTitle: (title: string) => void
) => {
  const { isSignedIn } = useDrive();

  const createNote = useCallback(async (newNoteName: string) => {
    if (!newNoteName.trim()) return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      const parentFolder = folders.find(f => f.path === selectedPath);
      const parentDriveId = parentFolder?.driveFolderId;

      setSyncProgress(30);

      const initialContent = createNoteTemplate(newNoteName);

      setSyncProgress(50);

      let driveFileId;
      if (isSignedIn && parentDriveId) {
        setSyncProgress(60);
        // Ensure the filename has .md extension
        const fileName = newNoteName.endsWith('.md') ? newNoteName : `${newNoteName}.md`;
        driveFileId = await driveService.uploadFile(fileName, initialContent, parentDriveId);
        setSyncProgress(80);
      }

      const newNote: Note = {
        id: Date.now().toString(),
        title: newNoteName,
        content: initialContent,
        path: selectedPath,
        driveFileId: driveFileId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setNotes([...notes, newNote]);
      setSelectedNote(newNote);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [notes, folders, selectedPath, isSignedIn, setIsLoading, setSyncProgress, setNotes, setSelectedNote, setIsEditing, setEditTitle, setEditContent]);

  const createNoteFromCurrentContent = useCallback(async () => {
    const title = selectedNote ? `${selectedNote.title} - Copy` : 'New Note';
    const content = editContent || (selectedNote?.content || '');

    try {
      setIsLoading(true);
      setSyncProgress(10);

      const parentFolder = folders.find(f => f.path === selectedPath);
      const parentDriveId = parentFolder?.driveFolderId;

      setSyncProgress(30);

      let driveFileId: string | undefined;

      if (isSignedIn && parentDriveId) {
        setSyncProgress(50);
        // Ensure the filename has .md extension
        const fileName = title.endsWith('.md') ? title : `${title}.md`;
        driveFileId = await driveService.uploadFile(
          fileName,
          content,
          parentDriveId
        );
        setSyncProgress(80);
      }

      const newNote: Note = {
        id: Date.now().toString(),
        title,
        content,
        path: selectedPath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driveFileId
      };

      setNotes([...notes, newNote]);
      setSelectedNote(newNote);
      setIsEditing(true);
      setEditTitle(newNote.title);
      setEditContent(newNote.content);
      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to create note from current content:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [selectedNote, editContent, folders, selectedPath, isSignedIn, setIsLoading, setSyncProgress, setNotes, setSelectedNote, setIsEditing, setEditTitle, setEditContent]);

  const saveNote = useCallback(async () => {
    if (!selectedNote) return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      // Ensure the new title has .md extension if the original file had .md
      const originalTitle = selectedNote.title;
      const hasOriginalExtension = originalTitle.endsWith('.md');
      const newTitle = hasOriginalExtension && !editTitle.endsWith('.md') 
        ? `${editTitle}.md` 
        : editTitle;

      let updatedNote = {
        ...selectedNote,
        title: newTitle,
        content: editContent,
        updatedAt: new Date().toISOString()
      };

      setSyncProgress(30);

      // Update in Drive if signed in
      if (isSignedIn) {
        try {
          if (selectedNote.driveFileId) {
            setSyncProgress(50);
            
            // Determine what content to save to Drive
            let driveContent = editContent;
            if (selectedNote.isEncrypted && selectedNote.encryptedData) {
              // For encrypted notes, save the encrypted data to Drive
              driveContent = JSON.stringify({
                encrypted: true,
                data: selectedNote.encryptedData
              });
            }
            
            // Try to update existing file
            await driveService.updateFile(selectedNote.driveFileId, driveContent);
            
            // If title changed, also rename the file
            if (selectedNote.title !== newTitle) {
              await driveService.renameFile(selectedNote.driveFileId, newTitle);
            }
            setSyncProgress(80);
          } else {
            setSyncProgress(40);
            // No Drive file ID, create new file
            const parentFolder = folders.find(f => f.path === selectedNote.path);
            const parentDriveId = parentFolder?.driveFolderId;

            if (parentDriveId) {
              setSyncProgress(60);
              const newDriveFileId = await driveService.uploadFile(newTitle, editContent, parentDriveId);
              updatedNote = { ...updatedNote, driveFileId: newDriveFileId };
              setSyncProgress(80);
            }
          }
        } catch (driveError: unknown) {
          console.error('Drive error:', driveError);

          // If file not found (404), create new file
          const error = driveError as { status?: number; result?: { error?: { code?: number } } };
          if (error.status === 404 || (error.result?.error?.code === 404)) {

            const parentFolder = folders.find(f => f.path === selectedNote.path);
            const parentDriveId = parentFolder?.driveFolderId;

            if (parentDriveId) {
              try {
                setSyncProgress(60);
                const newDriveFileId = await driveService.uploadFile(newTitle, editContent, parentDriveId);
                updatedNote = { ...updatedNote, driveFileId: newDriveFileId };
                setSyncProgress(80);

              } catch (createError) {
                console.error('Failed to create new file:', createError);
                // Remove the invalid driveFileId
                updatedNote = { ...updatedNote, driveFileId: undefined };
              }
            } else {
              // Remove the invalid driveFileId
              updatedNote = { ...updatedNote, driveFileId: undefined };
            }
          } else {
            // Other Drive errors, remove the invalid driveFileId
            updatedNote = { ...updatedNote, driveFileId: undefined };
          }
        }
      }

      setSyncProgress(90);

      setNotes(notes.map(note =>
        note.id === selectedNote.id ? updatedNote : note
      ));
      setSelectedNote(updatedNote);
      setIsEditing(false);
      // Disable split mode when saving
      setIsSplitMode(false);

      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [selectedNote, editContent, editTitle, notes, folders, isSignedIn, setIsLoading, setSyncProgress, setNotes, setSelectedNote, setIsEditing, setIsSplitMode]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      
      const note = notes.find(n => n.id === noteId);

      setSyncProgress(30);

      // Delete from Drive if signed in and has Drive file ID
      if (isSignedIn && note?.driveFileId) {
        setSyncProgress(50);
        await driveService.deleteFile(note.driveFileId);
        setSyncProgress(80);
      }

      setNotes(notes.filter(note => note.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [notes, selectedNote, isSignedIn, setIsLoading, setSyncProgress, setNotes, setSelectedNote]);

  const renameNote = useCallback(async (noteId: string, currentTitle: string, newName: string) => {
    const noteToRename = notes.find(n => n.id === noteId);
    if (!noteToRename) return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      // Update note title in Drive if signed in and has Drive file ID
      if (isSignedIn && noteToRename.driveFileId) {
        setSyncProgress(30);
        // Ensure the new name has .md extension if the original file had .md
        const originalName = currentTitle;
        const hasOriginalExtension = originalName.endsWith('.md');
        const newFileName = hasOriginalExtension && !newName.endsWith('.md') 
          ? `${newName}.md` 
          : newName;
        await driveService.renameFile(noteToRename.driveFileId, newFileName);
        setSyncProgress(60);
      }

      // Ensure the new name has .md extension if the original file had .md
      const originalName = currentTitle;
      const hasOriginalExtension = originalName.endsWith('.md');
      const newFileName = hasOriginalExtension && !newName.endsWith('.md') 
        ? `${newName}.md` 
        : newName;

      // Update note locally
      setNotes(notes.map(note => {
        if (note.id === noteId) {
          return { ...note, title: newFileName };
        }
        return note;
      }));

      // Update selected note if it's the one being renamed
      if (selectedNote && selectedNote.id === noteId) {
        setSelectedNote({ ...selectedNote, title: newFileName });
      }

      setSyncProgress(100);

      // Keep progress at 100% for a moment before hiding
      setTimeout(() => {
        setSyncProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to rename note:', error);
    } finally {
      // Delay hiding loading state to show completion
      setTimeout(() => {
        setIsLoading(false);
      }, 700);
    }
  }, [notes, selectedNote, isSignedIn, setIsLoading, setSyncProgress, setNotes, setSelectedNote]);

  return {
    createNote,
    createNoteFromCurrentContent,
    saveNote,
    deleteNote,
    renameNote,
  };
}; 