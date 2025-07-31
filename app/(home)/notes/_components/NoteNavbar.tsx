import React from 'react';
import { Save, X, Edit, Split, Menu } from 'lucide-react';
import { ShareDropdown } from './ShareDropdown';
import SettingsDropdown from './SettingsDropdown';
import { Note } from './types';

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
}) => (
  <div className="border-b border-gray-600 px-6 py-4 flex-shrink-0" style={{ backgroundColor: '#31363F' }}>
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 mr-3 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-xl font-semibold bg-transparent text-white border-b border-gray-600 focus:outline-none focus:border-white"
          />
        ) : (
          <h1 className="text-xl font-semibold text-white">{selectedNote.title}</h1>
        )}
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Share Button */}
        <ShareDropdown
          noteId={selectedNote.id}
          noteTitle={selectedNote.title}
          noteContent={selectedNote.content}
        />

        {/* Split Mode Toggle */}
        <button
          onClick={() => setIsSplitMode(!isSplitMode)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${isSplitMode
            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/30'
            : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          title={`${isSplitMode ? 'Exit' : 'Enter'} Split Mode (Ctrl+Shift+S)`}
        >
          <Split size={16} />
          <span className="hidden sm:inline">{isSplitMode ? 'Exit Split' : 'Split View'}</span>
        </button>

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
              onClick={saveNote}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Save size={16} />
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={startEdit}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Edit size={16} />
          </button>
        )}
      </div>
    </div>
    <p className="text-sm text-gray-400 mt-1">
      Last updated: {new Date(selectedNote.updatedAt).toLocaleString()}
    </p>
  </div>
);

export default NoteNavbar;


