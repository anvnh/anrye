import { notificationService } from './notificationService';

/**
 * Helper functions for integrating notifications with existing app features
 */

// Calendar integration
export async function notifyCalendarEvent(
  eventTitle: string,
  eventTime: Date,
  isReminder: boolean = false
): Promise<void> {
  try {
    await notificationService.showCalendarNotification(eventTitle, eventTime, isReminder);
  } catch (error) {
    console.error('Failed to show calendar notification:', error);
  }
}


// Reminder integration
export async function scheduleReminder(
  title: string,
  body: string,
  reminderTime: Date
): Promise<number> {
  try {
    return await notificationService.showReminderNotification(title, body, reminderTime);
  } catch (error) {
    console.error('Failed to schedule reminder:', error);
    return 0;
  }
}

// Generic notification helper
export async function showAppNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    data?: any;
  }
): Promise<void> {
  try {
    await notificationService.showNotification({
      title,
      body,
      icon: options?.icon || '/icons/icon-192x192.png',
      tag: options?.tag || 'app-notification',
      requireInteraction: options?.requireInteraction || false,
      data: options?.data,
    });
  } catch (error) {
    console.error('Failed to show app notification:', error);
  }
}

// Check if notifications are supported and enabled
export function canSendNotifications(): boolean {
  return notificationService.isSupported() && 
         notificationService.getPermissionStatus().granted;
}

// Request notification permission with user-friendly messaging
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    return await notificationService.requestPermission();
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}
