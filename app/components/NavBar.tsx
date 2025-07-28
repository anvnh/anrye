'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, LogOut, Cloud, CloudOff } from 'lucide-react';
import { useDrive } from '../lib/driveContext';
import { useAuth } from '../lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoading, signIn, signOut } = useDrive();
  const { isAuthenticated, user, logout } = useAuth();

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="bg-secondary shadow-sm border-b border-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              AnRye
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
            <Link 
              href="/utils" 
              className={`transition-colors ${
                isActive('/utils') 
                  ? 'font-semibold text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Utils
            </Link>
            
            <Link 
              href="/editor" 
              className={`transition-colors ${
                isActive('/editor') 
                  ? 'font-semibold text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Editor
            </Link>
            
            <Link 
              href="/notes" 
              className={`transition-colors ${
                isActive('/notes') 
                  ? 'font-semibold text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Notes
            </Link>

            {/* Google Drive Status */}
            <div className="flex items-center">
              {isSignedIn ? (
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-green-400 hover:text-green-300 hover:bg-gray-700 transition-colors"
                  title="Signed in to Google Drive - Click to sign out"
                >
                  <Cloud size={16} />
                  <span className="text-sm">Drive</span>
                </button>
              ) : (
                <button
                  onClick={signIn}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Sign in to Google Drive"
                >
                  <CloudOff size={16} />
                  <span className="text-sm">
                    {isLoading ? 'Connecting...' : 'Drive'}
                  </span>
                </button>
              )}
            </div>

            {/* User Info and Logout */}
            {isAuthenticated && user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User size={20} style={{ color: '#EEEEEE' }} />
                  <span className="text-gray-300">{user.username}</span>
                  <span className="text-xs px-2 py-1 rounded-full text-white bg-green-600">
                    admin
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}