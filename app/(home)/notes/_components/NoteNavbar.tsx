import React, { useState, useEffect } from 'react';
import { Save, X, Edit, Split, Menu } from 'lucide-react';
import { ShareDropdown } from './ShareDropdown';
import SettingsDropdown from './SettingsDropdown';
import { Note } from './types';
import { driveService } from '@/app/lib/googleDrive';

interface NoteNavbarProps {
  selectedNote: Note;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (title: string) => void;
  setIsSplitMode: (v: boolean) => void;
  isSplitMode: boolean;
  tabSize: number;
  setTabSize: (n: number) => void;
  currentTheme: string;
  setCurrentTheme: (t: string) => void;
  themeOptions: { value: string; label: string }[];
  fontFamily: string;
  setFontFamily: (f: string) => void;
  fontSize: string;
  setFontSize: (s: string) => void;
  saveNote: () => void;
  cancelEdit: () => void;
  startEdit: () => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  onCloseNote: () => void;
}

const NoteNavbar: React.FC<NoteNavbarProps> = ({
  selectedNote,
  isEditing,
  editTitle,
  setEditTitle,
  setIsSplitMode,
  isSplitMode,
  tabSize,
  setTabSize,
  currentTheme,
  setCurrentTheme,
  themeOptions,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  saveNote,
  cancelEdit,
  startEdit,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  onCloseNote,
}) => {
  const [inputWidth, setInputWidth] = useState(10);

  useEffect(() => {
    if (isEditing) {
      setInputWidth(Math.max(editTitle.length + 2, 10));
    }
  }, [editTitle, isEditing]);

  const handleSaveNote = async () => {
    try {
      // Save note locally first
      saveNote();
      
      // Note: The rename logic is now handled in the saveNote function
      // No need to rename separately here as it's already done in saveNote
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  return (
  <div className="border-b border-gray-600 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0" style={{ backgroundColor: '#31363F' }}>
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      <div className="flex items-center min-w-0 flex-1">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1 sm:p-2 mr-2 sm:mr-3 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
          title="Toggle sidebar"
        >
          <Menu size={18} className="sm:w-5 sm:h-5" />
        </button>
        
        {isEditing ? (
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-lg sm:text-xl font-semibold bg-transparent text-white border-b border-gray-600 focus:outline-none focus:border-white min-w-0"
              style={{ 
                width: `${inputWidth}ch` 
              }}
            />
          </div>
        ) : (
          <h1 className="text-lg sm:text-xl font-semibold text-white truncate min-w-0" title={selectedNote.title}>
            {selectedNote.title}
          </h1>
        )}
      </div>

      <div className="flex items-center space-x-1 flex-shrink-0">
        {/* Close Note Button */}
        <button
          onClick={onCloseNote}
          className="px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-gray-600 text-white hover:bg-gray-700"
          title="Close Note"
        >
          <X size={16} />
          <span className="hidden sm:inline">
            Close
          </span>
        </button>

        {/* Share Button */}
        <ShareDropdown
          noteId={selectedNote.id}
          noteTitle={selectedNote.title}
          noteContent={selectedNote.content}
        />

        {/* Split Mode Toggle - Hidden on mobile */}
        {isEditing && (
          <button
            onClick={() => setIsSplitMode(!isSplitMode)}
            className={`hidden lg:flex px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 items-center gap-1 ${isSplitMode
              ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/30'
              : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            title={`${isSplitMode ? 'Exit' : 'Enter'} Split Mode (Ctrl+\\)`}
          >
            <Split size={14} className="lg:w-4 lg:h-4" />
            <span>
              Split View
            </span>
          </button>
        )}

        {/* Settings Dropdown */}
        <SettingsDropdown
          tabSize={tabSize}
          setTabSize={setTabSize}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          themeOptions={themeOptions}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          fontSize={fontSize}
          setFontSize={setFontSize}
        />

        {isEditing ? (
          <>
            <button
              onClick={handleSaveNote}
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
              title="Save"
            >
              <Save size={14} className="sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
              title="Cancel"
            >
              <X size={14} className="sm:w-4 sm:h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={startEdit}
            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            title="Edit"
          >
            <Edit size={14} className="sm:w-4 sm:h-4" />
          </button>
        )}
      </div>
    </div>
    <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
      <span className="hidden sm:inline">Last updated: </span>
      {new Date(selectedNote.updatedAt).toLocaleString()}
    </p>
  </div>
  );
}

export default NoteNavbar;


