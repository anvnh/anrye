import React, { useState, useEffect } from 'react';
import { Save, X, XCircle, ArrowLeft, Edit, Split, Menu, PanelLeftOpen, Image as ImageIcon } from 'lucide-react';
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
  previewFontSize: string;
  setPreviewFontSize: (s: string) => void;
  codeBlockFontSize: string;
  setCodeBlockFontSize: (s: string) => void;
  saveNote: () => void;
  cancelEdit: () => void;
  startEdit: () => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  onCloseNote: () => void;
  isSidebarHidden: boolean;
  onToggleSidebar: () => void;
  onOpenImageManager: () => void;
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
  previewFontSize,
  setPreviewFontSize,
  codeBlockFontSize,
  setCodeBlockFontSize,
  saveNote,
  cancelEdit,
  startEdit,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  onCloseNote,
  isSidebarHidden,
  onToggleSidebar,
  onOpenImageManager,
}) => {
  const [inputWidth, setInputWidth] = useState(10);

  // Helper function to format the last updated time
  const formatLastUpdated = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    // Format the time as HH:MM
    const timeString = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // Format the date as dd/mm/yyyy
    const dateStringFormatted = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Create time ago string with proper conversions
    let timeAgoString = '';
    
    if (diffInYears > 0) {
      timeAgoString = `${diffInYears} year${diffInYears > 1 ? 's' : ''}`;
      if (diffInMonths % 12 > 0) {
        timeAgoString += ` ${diffInMonths % 12} month${(diffInMonths % 12) > 1 ? 's' : ''}`;
      }
    } else if (diffInMonths > 0) {
      timeAgoString = `${diffInMonths} month${diffInMonths > 1 ? 's' : ''}`;
      if (diffInDays % 30 > 0) {
        timeAgoString += ` ${diffInDays % 30} day${(diffInDays % 30) > 1 ? 's' : ''}`;
      }
    } else if (diffInDays > 0) {
      timeAgoString = `${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
      if (diffInHours % 24 > 0) {
        timeAgoString += ` ${diffInHours % 24} hour${(diffInHours % 24) > 1 ? 's' : ''}`;
      }
    } else if (diffInHours > 0) {
      timeAgoString = `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
      if (diffInMinutes % 60 > 0) {
        timeAgoString += ` ${diffInMinutes % 60} minute${(diffInMinutes % 60) > 1 ? 's' : ''}`;
      }
    } else if (diffInMinutes > 0) {
      timeAgoString = `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
      if (diffInSeconds % 60 > 0) {
        timeAgoString += ` ${diffInSeconds % 60} second${(diffInSeconds % 60) > 1 ? 's' : ''}`;
      }
    } else {
      timeAgoString = `${diffInSeconds} second${diffInSeconds > 1 ? 's' : ''}`;
    }
    
    return `${timeAgoString} ago at ${timeString} - ${dateStringFormatted}`;
  };

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

        {/* Desktop Sidebar Toggle - Only show when sidebar is hidden */}
        {isSidebarHidden && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-1 sm:p-2 mr-2 sm:mr-3 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
            title="Show sidebar"
          >
            <PanelLeftOpen size={18} className="sm:w-5 sm:h-5" />
          </button>
        )}
        
        {isEditing ? (
          <div className="flex-1 min-w-0">
            <div className="overflow-x-auto max-w-full">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg sm:text-xl font-semibold bg-transparent text-white border-b border-gray-600 focus:outline-none focus:border-white inline-block"
                style={{
                  width: `${inputWidth}ch`
                }}
              />
            </div>
          </div>
        ) : (
          <h1 className="text-lg sm:text-md font-semibold text-white truncate min-w-0" title={selectedNote.title}>
            {selectedNote.title}
          </h1>
        )}
      </div>

      <div
        className={
          `flex items-center gap-1 sm:gap-2 shrink justify-end
           ${isEditing ? 'max-w-[60vw]' : 'max-w-none'}
           min-w-0 flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap`
        }
      >
        {/* Close Note Button */}
        <button
          onClick={onCloseNote}
          className="px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-gray-600 text-white hover:bg-gray-700"
          title="Close Note"
        >
          <XCircle size={16} />
          <span className="hidden sm:inline">
            Close
          </span>
        </button>

        {/* Image Manager Button */}
        <button
          onClick={onOpenImageManager}
          className="px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-gray-600 text-white hover:bg-gray-700"
          title="Manage Images"
        >
          <ImageIcon size={16} />
          <span className="hidden sm:inline">
            Images
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
          previewFontSize={previewFontSize}
          setPreviewFontSize={setPreviewFontSize}
          codeBlockFontSize={codeBlockFontSize}
          setCodeBlockFontSize={setCodeBlockFontSize}
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
              title="Exit Edit"
            >
              <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
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
      {formatLastUpdated(selectedNote.updatedAt)}
    </p>
  </div>
  );
}

export default NoteNavbar;


