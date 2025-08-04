'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { gsap } from 'gsap';
import { MemoizedMarkdown } from '@/app/(home)/notes/_utils';
import NoteOutlineSidebar from '@/app/(home)/notes/_components/NoteOutlineSidebar';
import { Note } from '@/app/(home)/notes/_components/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircleIcon } from 'lucide-react';
import { List, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ShareSettings {
  readPermission: 'public' | 'password-required';
  readPassword?: string;
}

export default function SharedNotePage() {
  const params = useParams();
  const shareId = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [shareSettings, setShareSettings] = useState<ShareSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<'read' | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [hasReadAccess, setHasReadAccess] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);

  const [passwordError, setPasswordError] = useState(false);

  const outlineRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // GSAP animations for outline
  useEffect(() => {
    if (!outlineRef.current || !backdropRef.current) return;

    const outline = outlineRef.current;
    const backdrop = backdropRef.current;

    if (isOutlineOpen) {
      // Animate backdrop fade in
      gsap.fromTo(backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );

      // Animate outline slide in from left
      gsap.fromTo(outline,
        { x: -320, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    } else {
      // Animate backdrop fade out
      gsap.to(backdrop, { opacity: 0, duration: 0.2, ease: "power2.in" });

      // Animate outline slide out to left
      gsap.to(outline, { x: -320, opacity: 0, duration: 0.3, ease: "power2.in" });
    }
  }, [isOutlineOpen]);

  // Button animation on hover
  useEffect(() => {
    if (!buttonRef.current) return;

    const button = buttonRef.current;

    const handleMouseEnter = () => {
      gsap.to(button, { scale: 1.05, duration: 0.2, ease: "power2.out" });
    };

    const handleMouseLeave = () => {
      gsap.to(button, { scale: 1, duration: 0.2, ease: "power2.out" });
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

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


        setNote(sharedNote.note);
        setShareSettings(sharedNote.settings);

        // Check access permissions
        if (sharedNote.settings.readPermission === 'public') {
          setHasReadAccess(true);
        }

        return;
      }

      // Fallback to localStorage for development/backward compatibility
      const sharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
      const sharedNote = sharedNotes[shareId];

      if (!sharedNote) {
        setError('Shared note not found');
        return;
      }

      setNote(sharedNote.note);
      setShareSettings(sharedNote.settings);

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

  const checkPassword = (type: 'read') => {
    if (!shareSettings) return;
    const correctPasswordValue = shareSettings.readPassword;
    if (enteredPassword === correctPasswordValue) {
      setHasReadAccess(true);
      setPasswordPrompt(null);
      setEnteredPassword('');
    } else {
      setPasswordError(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-main flex items-center justify-center p-4">
        <div className="text-white text-base sm:text-lg text-center">Loading shared note...</div>
      </div>
    );
  }

  if (error || !note || !shareSettings) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">404</h1>
          <p className="text-gray-400 text-sm sm:text-base">{error || 'Shared note not found'}</p>
        </div>
      </div>
    );
  }

  if (!canRead(shareSettings)) {
    if (shareSettings.readPermission === 'password-required' && !hasReadAccess) {
      return (
        <div className="min-h-screen bg-main flex items-center justify-center p-4">
          <div className="bg-secondary p-4 sm:p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
              Password Required
            </h2>
            <p className="text-gray-400 mb-3 sm:mb-4 text-sm sm:text-base">
              This note requires a password to view.
            </p>
            <div className="space-y-3 sm:space-y-4">
              <input
                type="password"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 bg-main text-white rounded-md border-gray-600 focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                onKeyPress={(e) => e.key === 'Enter' && checkPassword('read')}
              />
              {passwordError && (
                <Alert variant="destructive" className='mt-3 sm:mt-4 bg-main border-none'>
                  <AlertCircleIcon />
                  <AlertTitle>
                    Wrong Password
                  </AlertTitle>
                  <AlertDescription>
                    <p className="text-sm">
                      Please verify your password and try again.
                    </p>
                    <ul className="list-inside list-disc text-xs sm:text-sm mt-2">
                      <li>
                        Check for typos
                      </li>
                      <li>Ask the note owner for the correct password</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => checkPassword('read')}
                  className="flex-1 px-3 sm:px-4 py-2 cursor-pointer bg-gradient-main text-white rounded text-sm sm:text-base"
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
            Access Denied
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            You don't have permission to view this note
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-main flex flex-col">
        {/* Header */}
        <div className="bg-secondary border-b border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
            <div className="min-w-0 flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <h1 className="text-lg sm:text-xl font-semibold text-white truncate cursor-pointer select-none hover:text-blue-300 transition-colors">
                    {note.title}
                  </h1>
                </PopoverTrigger>
                <PopoverContent side="bottom" className="max-w-xs bg-secondary border-gray-600">
                  <p className="text-sm text-white">{note.title}</p>
                </PopoverContent>
              </Popover>
              <p className="text-xs sm:text-sm text-gray-400">Shared Note</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="h-full flex relative">
            {/* Mobile Outline Toggle Button */}
            <div className="lg:hidden fixed top-20 right-4 z-50">
              <button
                ref={buttonRef}
                onClick={() => setIsOutlineOpen(!isOutlineOpen)}
                className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-gray-300 hover:text-white hover:bg-gray-700/80 transition-colors"
                title="Toggle outline"
              >
                {isOutlineOpen ? <X size={20} /> : <List size={20} />}
              </button>
            </div>

            {/* Mobile Outline Overlay */}
            {isOutlineOpen && (
              <div className="lg:hidden fixed inset-0 z-40">
                {/* Backdrop */}
                <div
                  ref={backdropRef}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setIsOutlineOpen(false)}
                />

                {/* Outline Panel */}
                <div
                  ref={outlineRef}
                  className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-main border-r border-gray-700 shadow-xl"
                >
                  <div className="h-full">
                    <NoteOutlineSidebar content={note.content} />
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Outline Sidebar */}
            <div className="w-60 flex-shrink-0 hidden lg:block sticky top-0 h-screen">
              <NoteOutlineSidebar content={note.content} />
            </div>

            {/* Main Content */}
            <div className="flex-1 px-4 sm:px-8 lg:px-16 xl:px-64 py-4 sm:py-6 h-full bg-main">
              <MemoizedMarkdown content={note.content} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
