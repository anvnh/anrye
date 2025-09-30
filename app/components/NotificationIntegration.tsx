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


  useEffect(() => {
    // Register service worker and set up push notifications
    const setupNotifications = async () => {
      if (!isSupported) {
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
                  
                  setSetupComplete(true);
                } catch (error) {
                  // Silent fail for server connection
                }
              }
            } catch (error) {
              // Silent fail for subscription
            }
          }
        }
      } catch (error) {
        // Silent fail for setup errors
      }
    };

    if (!setupComplete) {
      setupNotifications();
    }
  }, [isSupported, permission.granted, permission.denied, registerServiceWorker, subscribeToPushNotifications, showNotification, setupComplete]);

  return <>{children}</>;
}
