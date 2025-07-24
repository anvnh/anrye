'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear user data from localStorage
    localStorage.removeItem('user');
    
    // Redirect to home page after a short delay
    const timer = setTimeout(() => {
      router.push('/');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <LogOut className="mx-auto h-12 w-12" style={{ color: '#555879' }} />
          <h2 className="mt-6 text-center text-3xl font-extrabold" style={{ color: '#555879' }}>
            Logging you out...
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: '#6b7280' }}>
            You will be redirected to the home page shortly
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-2 rounded-full w-full" style={{ backgroundColor: '#555879', opacity: 0.3 }}></div>
          </div>
          <p className="mt-4 text-sm" style={{ color: '#6b7280' }}>
            Clearing session data...
          </p>
        </div>
      </div>
    </div>
  );
}