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
  const DISABLED_KEY = 'pwa_install_prompt_disabled';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If user previously dismissed, never show again
    const permanentlyDisabled = localStorage.getItem(DISABLED_KEY) === '1';
    if (permanentlyDisabled) return;

    // Optional: respect previous snooze window
    const snoozeUntilRaw = localStorage.getItem('pwa_install_prompt_dismissed_until');
    const snoozeUntil = snoozeUntilRaw ? parseInt(snoozeUntilRaw, 10) : 0;
    if (snoozeUntil && Date.now() < snoozeUntil) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide prompt if app gets installed via other means
    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
  // Permanently disable future prompts after dismiss
  localStorage.setItem(DISABLED_KEY, '1');
    }
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
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