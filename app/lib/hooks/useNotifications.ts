'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationOptions, NotificationPermission } from '../notificationService';

export interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isServiceWorkerSupported: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (options: NotificationOptions) => Promise<Notification | null>;
  showPersistentNotification: (options: NotificationOptions) => Promise<Notification | null>;
  showReminderNotification: (title: string, body: string, reminderTime: Date) => Promise<number>;
  showCalendarNotification: (eventTitle: string, eventTime: Date, isReminder?: boolean) => Promise<Notification | null>;
  scheduleNotification: (options: NotificationOptions, delay: number) => Promise<number>;
  cancelScheduledNotification: (timeoutId: number) => void;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
  subscribeToPushNotifications: (registration: ServiceWorkerRegistration) => Promise<PushSubscription | null>;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true,
  });

  const isSupported = notificationService.isSupported();
  const isServiceWorkerSupported = notificationService.isServiceWorkerSupported();

  useEffect(() => {
    if (isSupported) {
      setPermission(notificationService.getPermissionStatus());
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermission();
    setPermission(notificationService.getPermissionStatus());
    return granted;
  }, []);

  const showNotification = useCallback(async (options: NotificationOptions): Promise<Notification | null> => {
    return notificationService.showNotification(options);
  }, []);

  const showPersistentNotification = useCallback(async (options: NotificationOptions): Promise<Notification | null> => {
    return notificationService.showPersistentNotification(options);
  }, []);

  const showReminderNotification = useCallback(async (
    title: string,
    body: string,
    reminderTime: Date
  ): Promise<number> => {
    return notificationService.showReminderNotification(title, body, reminderTime);
  }, []);

  const showCalendarNotification = useCallback(async (
    eventTitle: string,
    eventTime: Date,
    isReminder: boolean = false
  ): Promise<Notification | null> => {
    return notificationService.showCalendarNotification(eventTitle, eventTime, isReminder);
  }, []);


  const scheduleNotification = useCallback(async (
    options: NotificationOptions,
    delay: number
  ): Promise<number> => {
    return notificationService.scheduleNotification(options, delay);
  }, []);

  const cancelScheduledNotification = useCallback((timeoutId: number): void => {
    notificationService.cancelScheduledNotification(timeoutId);
  }, []);

  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    return notificationService.registerServiceWorker();
  }, []);

  const subscribeToPushNotifications = useCallback(async (
    registration: ServiceWorkerRegistration
  ): Promise<PushSubscription | null> => {
    return notificationService.subscribeToPushNotifications(registration);
  }, []);

  return {
    permission,
    isSupported,
    isServiceWorkerSupported,
    requestPermission,
    showNotification,
    showPersistentNotification,
    showReminderNotification,
    showCalendarNotification,
    scheduleNotification,
    cancelScheduledNotification,
    registerServiceWorker,
    subscribeToPushNotifications,
  };
}
