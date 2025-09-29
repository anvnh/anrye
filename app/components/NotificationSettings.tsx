'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/app/lib/hooks/useNotifications';

interface NotificationPreferences {
  enabled: boolean;
  calendarEvents: boolean;
  noteUpdates: boolean;
  syncStatus: boolean;
  reminders: boolean;
  pushNotifications: boolean;
}

export default function NotificationSettings() {
  const {
    permission,
    isSupported,
    isServiceWorkerSupported,
    requestPermission,
    registerServiceWorker,
    subscribeToPushNotifications,
  } = useNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    calendarEvents: true,
    noteUpdates: true,
    syncStatus: true,
    reminders: true,
    pushNotifications: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedPreferences = localStorage.getItem('notification-preferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }

    // Check if service worker is already registered
    if (isServiceWorkerSupported) {
      navigator.serviceWorker.ready.then(setSwRegistration);
    }
  }, [isServiceWorkerSupported]);

  const savePreferences = (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem('notification-preferences', JSON.stringify(newPreferences));
  };

  const handlePermissionRequest = async () => {
    setIsLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        savePreferences({ ...preferences, enabled: true });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceWorkerRegistration = async () => {
    setIsLoading(true);
    try {
      const registration = await registerServiceWorker();
      if (registration) {
        setSwRegistration(registration);
        savePreferences({ ...preferences, pushNotifications: true });
      }
    } catch (error) {
      console.error('Error registering service worker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushSubscription = async () => {
    if (!swRegistration) return;

    setIsLoading(true);
    try {
      const subscription = await subscribeToPushNotifications(swRegistration);
      if (subscription) {
        // Send subscription to your server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatus = () => {
    if (!isSupported) return { status: 'unsupported', message: 'Notifications not supported' };
    if (permission.granted) return { status: 'granted', message: 'Notifications enabled' };
    if (permission.denied) return { status: 'denied', message: 'Notifications blocked' };
    return { status: 'default', message: 'Permission not requested' };
  };

  const permissionStatus = getPermissionStatus();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure how and when you receive notifications from AnRye.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Permission Status</span>
              <Badge
                variant={
                  permissionStatus.status === 'granted'
                    ? 'default'
                    : permissionStatus.status === 'denied'
                    ? 'destructive'
                    : 'secondary'
                }
                className="flex items-center gap-1"
              >
                {permissionStatus.status === 'granted' && <CheckCircle className="w-3 h-3" />}
                {permissionStatus.status === 'denied' && <XCircle className="w-3 h-3" />}
                {permissionStatus.status === 'default' && <AlertCircle className="w-3 h-3" />}
                {permissionStatus.message}
              </Badge>
            </div>
            {permissionStatus.status !== 'granted' && (
              <Button
                onClick={handlePermissionRequest}
                disabled={isLoading || permissionStatus.status === 'denied'}
                size="sm"
              >
                {permissionStatus.status === 'denied' ? 'Blocked' : 'Enable Notifications'}
              </Button>
            )}
          </div>

          {/* Notification Types */}
          {permission.granted && (
            <div className="space-y-4">
              <h4 className="font-medium">Notification Types</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Calendar Events</label>
                  <p className="text-xs text-gray-500">Get notified about upcoming calendar events</p>
                </div>
                <Switch
                  checked={preferences.calendarEvents}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, calendarEvents: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Note Updates</label>
                  <p className="text-xs text-gray-500">Get notified when notes are created or updated</p>
                </div>
                <Switch
                  checked={preferences.noteUpdates}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, noteUpdates: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Sync Status</label>
                  <p className="text-xs text-gray-500">Get notified about data sync status</p>
                </div>
                <Switch
                  checked={preferences.syncStatus}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, syncStatus: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Reminders</label>
                  <p className="text-xs text-gray-500">Get notified about scheduled reminders</p>
                </div>
                <Switch
                  checked={preferences.reminders}
                  onCheckedChange={(checked) =>
                    savePreferences({ ...preferences, reminders: checked })
                  }
                />
              </div>
            </div>
          )}

          {/* Push Notifications */}
          {isServiceWorkerSupported && (
            <div className="space-y-4">
              <h4 className="font-medium">Push Notifications</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Background Notifications</label>
                  <p className="text-xs text-gray-500">
                    Receive notifications even when the app is closed
                  </p>
                </div>
                <div className="flex gap-2">
                  {!swRegistration && (
                    <Button
                      onClick={handleServiceWorkerRegistration}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                    >
                      Register Service Worker
                    </Button>
                  )}
                  {swRegistration && !preferences.pushNotifications && (
                    <Button
                      onClick={handlePushSubscription}
                      disabled={isLoading}
                      size="sm"
                    >
                      Enable Push Notifications
                    </Button>
                  )}
                  {preferences.pushNotifications && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Enabled
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Test Notification */}
          {permission.granted && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  // This would be implemented in the parent component
                  console.log('Test notification clicked');
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Send Test Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
