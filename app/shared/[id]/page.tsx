'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { NoteRegularEditor } from '@/app/(home)/notes/_components';
import { MemoizedMarkdown } from '@/app/(home)/notes/_utils';
import { Note } from '@/app/(home)/notes/_components/types';

interface ShareSettings {
  editMode: 'edit' | 'view';
  readPermission: 'public' | 'password-required';
  writePermission: 'only-me' | 'password-required';
  readPassword?: string;
  writePassword?: string;
}

export default function SharedNotePage() {
  const params = useParams();
  const shareId = params.id as string;
  
  const [note, setNote] = useState<Note | null>(null);
  const [shareSettings, setShareSettings] = useState<ShareSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [passwordPrompt, setPasswordPrompt] = useState<'read' | 'write' | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [hasReadAccess, setHasReadAccess] = useState(false);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);

  useEffect(() => {
    loadSharedNote();
  }, [shareId]);

  const loadSharedNote = async () => {
    try {
      setLoading(true);
      
      // Try to load from server first
      const response = await fetch(`/api/shared-notes?id=${shareId}`);
      
      if (response.ok) {
        const sharedNote = await response.json();
        console.log('Loaded shared note from server:', sharedNote);
        
        setNote(sharedNote.note);
        setShareSettings(sharedNote.settings);
        setEditContent(sharedNote.note.content);
        
        // Check access permissions
        if (sharedNote.settings.readPermission === 'public') {
          setHasReadAccess(true);
        }
        
        return;
      }
      
      // Fallback to localStorage for development/backward compatibility
      const sharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      console.log('Falling back to localStorage. All shared notes:', sharedNotes);
      console.log('Looking for shareId:', shareId);
      
      const sharedNote = sharedNotes[shareId];
      console.log('Found shared note in localStorage:', sharedNote);
      
      if (!sharedNote) {
        setError('Shared note not found');
        return;
      }

      setNote(sharedNote.note);
      setShareSettings(sharedNote.settings);
      setEditContent(sharedNote.note.content);
      
      // Check access permissions
      if (sharedNote.settings.readPermission === 'public') {
        setHasReadAccess(true);
      }
      
    } catch (err) {
      setError('Failed to load shared note');
      console.error('Error loading shared note:', err);
    } finally {
      setLoading(false);
    }
  };

  const canRead = (settings: ShareSettings): boolean => {
    if (settings.readPermission === 'public') return true;
    if (settings.readPermission === 'password-required') return hasReadAccess;
    return false;
  };

  const canEdit = (settings: ShareSettings): boolean => {
    if (settings.writePermission === 'only-me') return false;
    if (settings.writePermission === 'password-required') return hasWriteAccess;
    return false;
  };

  const checkPassword = (type: 'read' | 'write') => {
    if (!shareSettings) return;
    
    const correctPassword = type === 'read' ? shareSettings.readPassword : shareSettings.writePassword;
    console.log('Checking password:', {
      type,
      entered: enteredPassword,
      correct: correctPassword,
      shareSettings
    });
    
    if (enteredPassword === correctPassword) {
      if (type === 'read') {
        setHasReadAccess(true);
      } else {
        setHasWriteAccess(true);
      }
      setPasswordPrompt(null);
      setEnteredPassword('');
    } else {
      alert(`Incorrect password. Expected: ${correctPassword}, Got: ${enteredPassword}`);
    }
  };

  const handleSaveEdit = () => {
    if (!note || !shareSettings) return;
    
    try {
      // Update the shared note content
      const sharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      if (sharedNotes[shareId]) {
        sharedNotes[shareId].note.content = editContent;
        sharedNotes[shareId].note.lastModified = new Date().toISOString();
        localStorage.setItem('sharedNotes', JSON.stringify(sharedNotes));
        
        setNote(prev => prev ? { ...prev, content: editContent, lastModified: new Date().toISOString() } : null);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error saving shared note:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(note?.content || '');
    setIsEditing(false);
  };

  const handleEditClick = () => {
    if (!shareSettings) return;
    
    if (shareSettings.writePermission === 'password-required' && !hasWriteAccess) {
      setPasswordPrompt('write');
    } else {
      setIsEditing(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading shared note...</div>
      </div>
    );
  }

  if (error || !note || !shareSettings) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">404</h1>
          <p className="text-gray-400">{error || 'Shared note not found'}</p>
        </div>
      </div>
    );
  }

  if (!canRead(shareSettings)) {
    if (shareSettings.readPermission === 'password-required' && !hasReadAccess) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">
                Password Required
            </h2>
            <p className="text-gray-400 mb-4">
                This note requires a password to view.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                onKeyPress={(e) => e.key === 'Enter' && checkPassword('read')}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => checkPassword('read')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Access Note
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">
            Access Denied
          </h1>
          <p className="text-gray-400">
            You don't have permission to view this note
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{note.title}</h1>
            <p className="text-sm text-gray-400">Shared Note</p>
          </div>
          
          <div className="flex items-center gap-2">
            {shareSettings.editMode === 'edit' && canEdit(shareSettings) && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  </>
                    ) : (
                      <button
                        onClick={handleEditClick}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Password Prompt Modal */}
          {passwordPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Password Required for {passwordPrompt === 'write' ? 'Editing' : 'Reading'}
                </h3>
                <input
                  type="password"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && checkPassword(passwordPrompt)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => checkPassword(passwordPrompt)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => {
                      setPasswordPrompt(null);
                      setEnteredPassword('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}      {/* Content */}
      <div className="flex-1">
        {isEditing ? (
          <NoteRegularEditor
            editContent={editContent}
            setEditContent={setEditContent}
          />
        ) : (
          <div className="h-full">
            <div className="px-96 py-6 h-full bg-gray-900">
              <MemoizedMarkdown content={note.content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
