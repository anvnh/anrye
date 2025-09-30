'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { User, LogOut, Cloud, CloudOff, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useDrive } from '../lib/driveContext';
import { useAuth } from '../lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn, isLoading, signIn, signOut } = useDrive();
  const { isAuthenticated, user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await logout();
  };

  const handleSwitchDriveAccount = async () => {
    try {
      // Clear sync flags and local caches so we load Drive data fresh for the new account
      if (typeof window !== 'undefined') {
        localStorage.removeItem('has-synced-drive');
        localStorage.removeItem('has-synced-with-drive');
        localStorage.removeItem('folders-cache');
        localStorage.removeItem('notes-cache');
        localStorage.removeItem('notes-new');
        localStorage.removeItem('folders-new');
      }
      await signOut();
      await signIn();
    } catch { }
  };

  return (
    <nav className="bg-secondary shadow-sm border-b border-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              AnRye
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/utils"
              prefetch={false}
              className={`px-3 py-2 rounded-md hover:bg-gray-700 transition-colors ${isActive('/utils')
                ? 'font-semibold text-white'
                : 'text-gray-300 hover:text-white'
                }`}
            >
              Utils
            </Link>


            <Link
              href="/notes"
              prefetch={false}
              className={`px-3 py-2 rounded-md hover:bg-gray-700 transition-colors ${isActive('/notes')
                ? 'font-semibold text-white'
                : 'text-gray-300 hover:text-white'
                }`}
            >
              Notes
            </Link>

            {/* User Info and Logout */}
            {isAuthenticated && user && (
              <div className="flex items-center space-x-4">
                <div className="text-gray-600">|</div>
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

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-600">
              <Link
                href="/utils"
                prefetch={false}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive('/utils')
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Utils
              </Link>


              <Link
                href="/notes"
                prefetch={false}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive('/notes')
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Notes
              </Link>
            </div>

            {/* Mobile User Info and Logout */}
            {isAuthenticated && user && (
              <div className="border-t border-gray-600 pt-3">
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 w-full text-left text-gray-300 hover:text-red-400 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
