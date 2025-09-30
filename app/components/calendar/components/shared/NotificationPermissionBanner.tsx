"use client";

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/app/lib/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { X, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationPermissionBannerProps {
  notesTheme: 'light' | 'dark';
  onDismiss?: () => void;
}

export function NotificationPermissionBanner({ notesTheme, onDismiss }: NotificationPermissionBannerProps) {
  const { permission, requestPermission, isSupported } = useNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check if user has previously dismissed this banner
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setIsDismissed(true);
        localStorage.setItem('notification-banner-dismissed', 'true');
        onDismiss?.();
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('notification-banner-dismissed', 'true');
    onDismiss?.();
  };

  // Don't show if notifications are not supported, already granted, denied, or dismissed
  if (!isSupported || permission.granted || permission.denied || isDismissed) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border-2 mb-4",
      notesTheme === 'light' 
        ? "bg-blue-50 border-blue-200 text-blue-900" 
        : "bg-blue-900/20 border-blue-700 text-blue-100"
    )}>
      <div className="flex items-center space-x-3">
        <Bell className="h-5 w-5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-sm">Enable Event Reminders</h4>
          <p className="text-xs opacity-90">
            Get notified about your calendar events before they start
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          onClick={handleRequestPermission}
          disabled={isRequesting}
          className={cn(
            "h-8 px-3 text-xs",
            notesTheme === 'light' 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
          )}
        >
          {isRequesting ? 'Enabling...' : 'Enable'}
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface NotificationStatusProps {
  notesTheme: 'light' | 'dark';
  className?: string;
}

export function NotificationStatus({ notesTheme, className }: NotificationStatusProps) {
  const { permission, isSupported } = useNotifications();

  if (!isSupported) {
    return (
      <div className={cn(
        "flex items-center space-x-2 text-sm",
        notesTheme === 'light' ? "text-gray-600" : "text-gray-400",
        className
      )}>
        <BellOff className="h-4 w-4" />
        <span>Notifications not supported</span>
      </div>
    );
  }

  if (permission.denied) {
    return (
      <div className={cn(
        "flex items-center space-x-2 text-sm",
        notesTheme === 'light' ? "text-red-600" : "text-red-400",
        className
      )}>
        <BellOff className="h-4 w-4" />
        <span>Notifications blocked</span>
      </div>
    );
  }

  if (permission.granted) {
    return (
      <div className={cn(
        "flex items-center space-x-2 text-sm",
        notesTheme === 'light' ? "text-green-600" : "text-green-400",
        className
      )}>
        <Bell className="h-4 w-4" />
        <span>Reminders enabled</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center space-x-2 text-sm",
      notesTheme === 'light' ? "text-yellow-600" : "text-yellow-400",
      className
    )}>
      <Bell className="h-4 w-4" />
      <span>Enable reminders</span>
    </div>
  );
}
