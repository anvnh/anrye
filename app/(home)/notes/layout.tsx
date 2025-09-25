'use client';

import './notes.css';

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-main overflow-hidden">
        {children}
    </div>
  );
} 