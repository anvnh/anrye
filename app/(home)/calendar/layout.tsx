'use client';

import { useAuth } from '../../lib/auth';
import '../notes/notes.css';

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-main overflow-hidden">
        {children}
    </div>
  );
}
