'use client';

import { useAuth } from '../../lib/auth';
import './notes.css';

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-main overflow-hidden">
      <main className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 