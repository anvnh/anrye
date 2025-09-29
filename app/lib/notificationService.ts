export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = {
    granted: false,
    denied: false,
    default: true,
  };

  private constructor() {
    this.updatePermissionStatus();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private updatePermissionStatus(): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.permission = { granted: false, denied: true, default: false };
      return;
    }

    const permission = Notification.permission;
    this.permission = {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    };
  }

  public getPermissionStatus(): NotificationPermission {
    this.updatePermissionStatus();
    return { ...this.permission };
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    if (this.permission.granted) {
      return true;
    }

    if (this.permission.denied) {
      console.warn('Notification permission has been denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.updatePermissionStatus();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public async showNotification(options: NotificationOptions): Promise<Notification | null> {
    if (!this.permission.granted) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Cannot show notification: permission not granted');
        return null;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        image: options.image,
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: options.timestamp || Date.now(),
        actions: options.actions,
        data: options.data,
      });

      // Auto-close notification after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  public async scheduleNotification(
    options: NotificationOptions,
    delay: number
  ): Promise<number> {
    return window.setTimeout(async () => {
      await this.showNotification(options);
    }, delay);
  }

  public cancelScheduledNotification(timeoutId: number): void {
    clearTimeout(timeoutId);
  }

  public async showPersistentNotification(
    options: NotificationOptions
  ): Promise<Notification | null> {
    return this.showNotification({
      ...options,
      requireInteraction: true,
      tag: options.tag || 'persistent',
    });
  }

  public async showReminderNotification(
    title: string,
    body: string,
    reminderTime: Date
  ): Promise<number> {
    const now = new Date();
    const delay = reminderTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn('Reminder time is in the past');
      return 0;
    }

    return this.scheduleNotification(
      {
        title,
        body,
        tag: 'reminder',
        requireInteraction: true,
      },
      delay
    );
  }

  public async showCalendarNotification(
    eventTitle: string,
    eventTime: Date,
    isReminder: boolean = false
  ): Promise<Notification | null> {
    const now = new Date();
    const timeUntilEvent = eventTime.getTime() - now.getTime();
    const minutesUntilEvent = Math.floor(timeUntilEvent / (1000 * 60));

    let title: string;
    let body: string;

    if (isReminder) {
      title = 'Event Reminder';
      body = `${eventTitle} is starting soon!`;
    } else {
      title = 'New Calendar Event';
      body = `${eventTitle} at ${eventTime.toLocaleTimeString()}`;
    }

    return this.showNotification({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      tag: 'calendar-event',
      data: {
        eventTitle,
        eventTime: eventTime.toISOString(),
        type: 'calendar',
      },
    });
  }

  public async showNoteNotification(
    noteTitle: string,
    action: 'created' | 'updated' | 'shared' = 'updated'
  ): Promise<Notification | null> {
    const actionText = {
      created: 'created',
      updated: 'updated',
      shared: 'shared with you',
    }[action];

    return this.showNotification({
      title: `Note ${actionText}`,
      body: `"${noteTitle}" has been ${actionText}`,
      icon: '/icons/icon-192x192.png',
      tag: 'note-update',
      data: {
        noteTitle,
        action,
        type: 'note',
      },
    });
  }

  public async showSyncNotification(
    status: 'success' | 'error' | 'in-progress',
    message?: string
  ): Promise<Notification | null> {
    const titles = {
      success: 'Sync Complete',
      error: 'Sync Failed',
      'in-progress': 'Syncing...',
    };

    const bodies = {
      success: message || 'Your data has been synced successfully',
      error: message || 'Failed to sync your data. Please check your connection.',
      'in-progress': message || 'Syncing your data...',
    };

    return this.showNotification({
      title: titles[status],
      body: bodies[status],
      icon: '/icons/icon-192x192.png',
      tag: 'sync-status',
      requireInteraction: status === 'error',
      data: {
        status,
        type: 'sync',
      },
    });
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isServiceWorkerSupported()) {
      console.warn('Service Worker is not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  public async subscribeToPushNotifications(
    registration: ServiceWorkerRegistration
  ): Promise<PushSubscription | null> {
    if (!registration.pushManager) {
      console.warn('Push messaging is not supported');
      return null;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VAPID public key is not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY in your environment variables.');
      return null;
    }

    try {
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String || base64String.trim() === '') {
      throw new Error('Base64 string is empty or invalid');
    }

    try {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      throw new Error(`Failed to convert base64 string to Uint8Array: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const notificationService = NotificationService.getInstance();
