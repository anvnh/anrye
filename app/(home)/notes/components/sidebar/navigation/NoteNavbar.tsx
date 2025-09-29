import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X, XCircle, ArrowLeft, Edit, Split, Menu, PanelLeftOpen, Image as ImageIcon, CalendarDays, MoreHorizontal, Eye, Copy, CheckCircle2Icon } from 'lucide-react';
import { ShareDropdown } from '../../forms/ShareDropdown';
import { SettingsPage } from '../../forms/SettingsPage';
import { Note } from '../../types';
import { driveService } from '@/app/(home)/notes/services/googleDrive';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface NoteNavbarProps {
  selectedNote: Note;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (title: string) => void;
  setIsSplitMode: (v: boolean) => void;
  isSplitMode: boolean;
  notesTheme: 'light' | 'dark';
  setNotesTheme?: (t: 'light' | 'dark') => void;
  // font settings
  fontFamily?: string;
  setFontFamily?: (v: string) => void;
  fontSize?: string;
  setFontSize?: (v: string) => void;
  previewFontSize?: string;
  setPreviewFontSize?: (v: string) => void;
  codeBlockFontSize?: string;
  setCodeBlockFontSize?: (v: string) => void;
  // theme/highlighter
  currentTheme?: string;
  setCurrentTheme?: (v: string) => void;
  themeOptions?: { value: string; label: string }[];
  // editor behavior
  tabSize?: number;
  setTabSize?: (v: number) => void;
  saveNote: () => void;
  cancelEdit: () => void;
  startEdit: () => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  onCloseNote: () => void;
  isSidebarHidden: boolean;
  onToggleSidebar: () => void;
  onOpenImageManager: () => void;
  onOpenCalendar: () => void;
  isPreviewMode: boolean;
  setIsPreviewMode: (v: boolean) => void;
  showLastUpdated?: boolean;
}

const NoteNavbar: React.FC<NoteNavbarProps> = ({
  selectedNote,
  isEditing,
  editTitle,
  setEditTitle,
  setIsSplitMode,
  isSplitMode,
  notesTheme,
  setNotesTheme,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  previewFontSize,
  setPreviewFontSize,
  codeBlockFontSize,
  setCodeBlockFontSize,
  currentTheme,
  setCurrentTheme,
  themeOptions,
  tabSize,
  setTabSize,
  saveNote,
  cancelEdit,
  startEdit,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  onCloseNote,
  isSidebarHidden,
  onToggleSidebar,
  onOpenImageManager,
  onOpenCalendar,
  isPreviewMode,
  setIsPreviewMode,
  showLastUpdated = true,
}) => {
  const [inputWidth, setInputWidth] = useState(10);
  const [showCopyAlert, setShowCopyAlert] = useState(false);

  const isNoNoteSelected = selectedNote.id === 'no-note';


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

  const handleCopyAllContent = async () => {
    try {
      await navigator.clipboard.writeText(selectedNote.content);
      setShowCopyAlert(true);
      setTimeout(() => setShowCopyAlert(false), 2000);
    } catch (err) {
      console.error('Failed to copy content to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = selectedNote.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopyAlert(true);
      setTimeout(() => setShowCopyAlert(false), 2000);
    }
  };

  return (
    <div className="border-b border-gray-600 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0 notes-header note-navbar">
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

        {/* Desktop Buttons - Hidden on mobile */}
        <div className="hidden lg:flex items-center gap-1 sm:gap-2 shrink justify-end min-w-0 flex-nowrap overflow-x-auto overflow-y-hidden whitespace-nowrap">
          {/* Close Note Button */}
          {!isNoNoteSelected && (
            <button
              onClick={onCloseNote}
              className={`px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-icon-notenavbar text-white
              ${notesTheme === 'light' ? 'bg-icon-notenavbar-light' : ''}`}
              title="Close Note"
            >
              <span className="hidden sm:inline">
                Close Note
              </span>
            </button>
          )}
          {/* Image Manager Button */}
          <button
            onClick={onOpenImageManager}
            className={`px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-icon-notenavbar text-white
              ${notesTheme === 'light' ? 'bg-icon-notenavbar-light' : ''}`}
            title="Manage Images"
          >
            <ImageIcon size={16} />
            <span className="hidden sm:inline">
              Images
            </span>
          </button>

          {/* Calendar Button */}
          <button
            onClick={onOpenCalendar}
            className={`px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-icon-notenavbar text-white
              ${notesTheme === 'light' ? 'bg-icon-notenavbar-light' : ''}`}
            title="Open Calendar"
          >
            <CalendarDays size={16} />
            <span className="hidden sm:inline">
              Calendar
            </span>
          </button>

          {/* Share Button */}
          {!isNoNoteSelected && (
            <ShareDropdown
              noteId={selectedNote.id}
              noteTitle={selectedNote.title}
              noteContent={selectedNote.content}
              notesTheme={notesTheme}
            />
          )}

          {/* Preview Mode Toggle - Only show when editing */}
          {isEditing && (
            <button
              onClick={() => {
                if (!isPreviewMode) {
                  // Enter preview mode: turn off split mode
                  setIsPreviewMode(true);
                  setIsSplitMode(false);
                } else {
                  // Exit preview mode
                  setIsPreviewMode(false);
                }
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 items-center gap-1 
                ${isPreviewMode
                  ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-400/30'
                  : 'bg-icon-notenavbar-active text-white'
                }`}
              title={`${isPreviewMode ? 'Exit' : 'Enter'} Preview Mode`}
            >
              <div className='flex items-center gap-1'>
                <Eye size={14} className="w-4 h-4" />
                <span className="hidden sm:inline">
                  Preview
                </span>
              </div>
            </button>
          )}

          {/* Split Mode Toggle - Hidden on mobile */}
          {isEditing && (
            <button
              onClick={() => setIsSplitMode(!isSplitMode)}
              className={`hidden lg:flex px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 items-center gap-1 
              ${isSplitMode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-icon-notenavbar-active text-white'
                }`}
              title={`${isSplitMode ? 'Exit' : 'Enter'} Split Mode (Ctrl+\\)`}
            >
              <Split size={14} className="lg:w-4 lg:h-4" />
              <span>
                Split View
              </span>
            </button>
          )}

          {/* Settings Page */}
          {setNotesTheme ? (
            <SettingsPage
              notesTheme={notesTheme}
              setNotesTheme={setNotesTheme}
              fontFamily={fontFamily ?? 'inherit'}
              setFontFamily={(v) => setFontFamily?.(v)}
              fontSize={fontSize ?? '16px'}
              setFontSize={(v) => setFontSize?.(v)}
              previewFontSize={previewFontSize ?? '16px'}
              setPreviewFontSize={(v) => setPreviewFontSize?.(v)}
              codeBlockFontSize={codeBlockFontSize ?? '14px'}
              setCodeBlockFontSize={(v) => setCodeBlockFontSize?.(v)}
              currentTheme={currentTheme ?? 'mocha'}
              setCurrentTheme={(v) => setCurrentTheme?.(v)}
              themeOptions={themeOptions ?? []}
              tabSize={tabSize ?? 2}
              setTabSize={(v) => setTabSize?.(v)}
            />
          ) : null}

          {isEditing ? (
            <>
              <button
                onClick={handleSaveNote}
                className="px-2 sm:px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 bg-green-600 text-white hover:bg-green-700"
                title="Save"
              >
                <Save size={16} />
                <span className="hidden sm:inline">
                  Save
                </span>
              </button>
              <button
                onClick={cancelEdit}
                className={`px-2 py-1 text-white rounded flex items-center bg-icon-notenavbar
                ${notesTheme === 'light' ? 'bg-icon-notenavbar-light' : ''}`}
                title="Exit Edit"
              >
                <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className={
                `px-2 py-1 bg-icon-notenavbar text-white rounded flex items-center 
                ${notesTheme === 'light' ? 'bg-icon-notenavbar-light' : ''
                }`}
              title="Edit"
            >
              <Edit size={14} className="sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={`w-56 bg-secondary border-gray-700 ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'}`}>
              <DropdownMenuItem onClick={onCloseNote} className="flex items-center gap-2 cursor-pointer mb-1">
                <XCircle size={16} />
                Close Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyAllContent} className="flex items-center gap-2 cursor-pointer mb-1">
                <Copy size={16} />
                Copy All Content
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenImageManager} className="flex items-center gap-2 cursor-pointer mb-1">
                <ImageIcon size={16} />
                Manage Images
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCalendar} className="flex items-center gap-2 cursor-pointer mb-1">
                <CalendarDays size={16} />
                Calendar
              </DropdownMenuItem>
              {isEditing && (
                <DropdownMenuItem onClick={() => {
                  if (!isPreviewMode) {
                    // Enter preview mode: turn off split mode
                    setIsPreviewMode(true);
                    setIsSplitMode(false);
                  } else {
                    // Exit preview mode
                    setIsPreviewMode(false);
                  }
                }} className={`flex items-center gap-2 cursor-pointer`}>
                  <Eye size={16} />
                  {isPreviewMode ? 'Exit Preview' : 'Preview'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onSelect={(e) => e.preventDefault()}>
                <ShareDropdown
                  noteId={selectedNote.id}
                  noteTitle={selectedNote.title}
                  noteContent={selectedNote.content}
                  notesTheme={notesTheme}
                />
              </DropdownMenuItem>
              {setNotesTheme ? (
                <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onSelect={(e) => e.preventDefault()}>
                  <SettingsPage
                    notesTheme={notesTheme}
                    setNotesTheme={setNotesTheme}
                    fontFamily={fontFamily ?? 'inherit'}
                    setFontFamily={(v) => setFontFamily?.(v)}
                    fontSize={fontSize ?? '16px'}
                    setFontSize={(v) => setFontSize?.(v)}
                    previewFontSize={previewFontSize ?? '16px'}
                    setPreviewFontSize={(v) => setPreviewFontSize?.(v)}
                    codeBlockFontSize={codeBlockFontSize ?? '14px'}
                    setCodeBlockFontSize={(v) => setCodeBlockFontSize?.(v)}
                    currentTheme={currentTheme ?? 'mocha'}
                    setCurrentTheme={(v) => setCurrentTheme?.(v)}
                    themeOptions={themeOptions ?? []}
                    tabSize={tabSize ?? 2}
                    setTabSize={(v) => setTabSize?.(v)}
                  />
                </DropdownMenuItem>
              ) : null}

              {isEditing ? (
                <>
                  <DropdownMenuItem onClick={handleSaveNote} className="flex items-center gap-2 cursor-pointer text-white">
                    <Save size={16} />
                    <span className={`${notesTheme === 'light' ? 'text-black' : 'text-white'}`}>
                      Save
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={cancelEdit} className="flex items-center gap-2 cursor-pointer">
                    <ArrowLeft size={16} />
                    Exit Edit
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={startEdit} className={`flex items-center gap-2 cursor-pointer ${notesTheme === 'light' ? 'text-black' : 'text-white'}`}>
                  <Edit size={16} />
                  Edit
                </DropdownMenuItem>
              )}

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {showLastUpdated && (
        <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
          <span className="hidden sm:inline">Last updated: </span>
          {formatLastUpdated(selectedNote.updatedAt)}
        </p>
      )}

      {/* Copy Notification (render in portal to avoid transform/overflow issues) */}
      {showCopyAlert && typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none">
          <Alert variant="default" className="alert-custom w-80 pointer-events-auto bg-sidebar">
            <CheckCircle2Icon className="h-5 w-5" />
            <AlertTitle>Content copied!</AlertTitle>
            <AlertDescription>
              All note content has been copied to your clipboard.
            </AlertDescription>
          </Alert>
        </div>,
        document.body
      )}
    </div>
  );
}

export default NoteNavbar;


