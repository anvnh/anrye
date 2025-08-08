'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-main border border-gray-700 rounded-lg shadow-xl p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">Install AnRye</h3>
          <p className="text-sm text-gray-300 mb-3">
            Install this app on your device for quick and easy access when you're on the go.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 