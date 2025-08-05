'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          router.push('/');
        }
      } catch (error) {
        // Not authenticated, stay on login page
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include', // Important for cookies
      });

      const data = await response.json();

      if (response.ok) {
        // Successful login, wait a bit for cookie to be set then redirect
        setTimeout(() => {
          window.location.href = '/'; // Force page reload to ensure middleware runs
        }, 100);
      } else {
        setError(data.error || 'Login failed');
        setAttempts(prev => prev + 1);
        
        // Clear password field on failed attempt
        setCredentials(prev => ({ ...prev, password: '' }));
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-main">
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="bg-secondary rounded-lg shadow-2xl p-8 border border-gray-600">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary mb-2">
                Anrye
              </h2>
              <p className="text-gray-400 mb-8">
                Secure Access Required
              </p>
            </div>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={credentials.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter username"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                  {attempts >= 3 && (
                    <div className="mt-2 text-xs text-red-400">
                      Multiple failed attempts detected. Please wait before trying again.
                    </div>
                  )}
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading || !credentials.username || !credentials.password}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isLoading || !credentials.username || !credentials.password
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure Connection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 px-8 border-t border-gray-600">
        <div className="max-w-md mx-auto flex justify-center space-x-6 text-sm">
          <Link 
            href="/privacy" 
            className="text-gray-400 hover:text-gray-300 transition-colors duration-200"
          >
            Privacy
          </Link>
          <Link 
            href="/terms" 
            className="text-gray-400 hover:text-gray-300 transition-colors duration-200"
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
