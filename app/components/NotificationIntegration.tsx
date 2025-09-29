'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/app/lib/hooks/useNotifications';

interface NotificationIntegrationProps {
  children: React.ReactNode;
}

export default function NotificationIntegration({ children }: NotificationIntegrationProps) {
  const {
    permission,
    isSupported,
    requestPermission,
    registerServiceWorker,
    subscribeToPushNotifications,
    showNotification,
  } = useNotifications();
  
  const [setupComplete, setSetupComplete] = useState(false);

  // Show welcome notification on first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('notification-welcome-seen');
    if (isSupported && !hasSeenWelcome) {
      showNotification({
        title: 'Welcome to AnRye!',
        body: 'Your personal notes and calendar app is ready to use.',
        tag: 'welcome'
      });
      localStorage.setItem('notification-welcome-seen', 'true');
    }
  }, [isSupported, showNotification]);

  useEffect(() => {
    // Auto-request permission on first visit
    const hasRequestedPermission = localStorage.getItem('notification-permission-requested');
    
    if (isSupported && !hasRequestedPermission && permission.default) {
      // Show a friendly notification about enabling notifications
      showNotification({
        title: 'Enable Notifications',
        body: 'Get notified about important updates and reminders!',
        requireInteraction: true,
        tag: 'permission-request'
      });
      localStorage.setItem('notification-permission-requested', 'true');
    }
  }, [isSupported, permission.default, showNotification]);

  useEffect(() => {
    // Register service worker and set up push notifications
    const setupNotifications = async () => {
      if (!isSupported) {
        showNotification({
          title: 'Notifications Not Supported',
          body: 'Your browser does not support notifications. Please use a modern browser.',
          requireInteraction: true,
          tag: 'browser-support'
        });
        return;
      }

      try {
        // Register service worker
        const registration = await registerServiceWorker();
        if (registration) {
          // Subscribe to push notifications if user has granted permission
          if (permission.granted) {
            try {
              const subscription = await subscribeToPushNotifications(registration);
              if (subscription) {
                // Send subscription to server
                try {
                  await fetch('/api/notifications/subscribe', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(subscription),
                  });
                  
                  // Show success notification
                  showNotification({
                    title: 'Notifications Enabled!',
                    body: 'You will now receive notifications for important updates.',
                    tag: 'setup-success'
                  });
                  setSetupComplete(true);
                } catch (error) {
                  showNotification({
                    title: 'Setup Incomplete',
                    body: 'Failed to connect to notification server. Some features may not work.',
                    requireInteraction: true,
                    tag: 'server-error'
                  });
                }
              } else {
                showNotification({
                  title: 'Configuration Error',
                  body: 'Push notifications are not properly configured. Please contact support.',
                  requireInteraction: true,
                  tag: 'config-error'
                });
              }
            } catch (error) {
              showNotification({
                title: 'Subscription Failed',
                body: 'Unable to set up push notifications. Please try again later.',
                requireInteraction: true,
                tag: 'subscription-error'
              });
            }
          } else if (permission.denied) {
            showNotification({
              title: 'Notifications Disabled',
              body: 'You can enable notifications in your browser settings to get important updates.',
              requireInteraction: true,
              tag: 'permission-denied'
            });
          }
        } else {
          showNotification({
            title: 'Service Worker Failed',
            body: 'Unable to register background service. Some features may not work properly.',
            requireInteraction: true,
            tag: 'service-worker-error'
          });
        }
      } catch (error) {
        showNotification({
          title: 'Setup Failed',
          body: 'Unable to set up notifications. Please refresh the page and try again.',
          requireInteraction: true,
          tag: 'setup-error'
        });
      }
    };

    if (!setupComplete) {
      setupNotifications();
    }
  }, [isSupported, permission.granted, permission.denied, registerServiceWorker, subscribeToPushNotifications, showNotification, setupComplete]);

  return <>{children}</>;
}
