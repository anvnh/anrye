'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export default function PWAStatus() {
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check if app is running in standalone mode (installed)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setIsPWAInstalled(!!registration.active);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isPWAInstalled && !isStandalone) {
    return null; // Don't show anything if PWA is not installed
  }

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="flex flex-col gap-2">
        {isStandalone && (
          <Badge variant="secondary" className="bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            PWA Installed
          </Badge>
        )}
        {!isOnline && (
          <Badge variant="secondary" className="bg-yellow-600 text-white">
            <Info className="w-3 h-3 mr-1" />
            Offline Mode
          </Badge>
        )}
      </div>
    </div>
  );
} 