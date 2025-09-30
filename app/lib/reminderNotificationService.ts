'use client';

import { notificationService } from './notificationService';
import type { IEvent } from '@/app/components/calendar/interfaces';

interface ScheduledReminder {
  eventId: string;
  reminderId: string;
  timeoutId: number;
  eventTitle: string;
  eventTime: Date;
  reminderMinutes: number;
}

interface ReminderNotificationService {
  startReminderService(): void;
  stopReminderService(): void;
  scheduleEventReminders(event: IEvent): void;
  cancelEventReminders(eventId: string): void;
  updateEventReminders(event: IEvent): void;
  isServiceRunning(): boolean;
}

class ReminderNotificationServiceImpl implements ReminderNotificationService {
  private scheduledReminders: Map<string, ScheduledReminder[]> = new Map();
  private serviceInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkInterval = 60000; // Check every minute

  constructor() {
    // Bind methods to preserve context
    this.startReminderService = this.startReminderService.bind(this);
    this.stopReminderService = this.stopReminderService.bind(this);
    this.scheduleEventReminders = this.scheduleEventReminders.bind(this);
    this.cancelEventReminders = this.cancelEventReminders.bind(this);
    this.updateEventReminders = this.updateEventReminders.bind(this);
    this.isServiceRunning = this.isServiceRunning.bind(this);
  }

  public startReminderService(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Check for reminders every minute
    this.serviceInterval = setInterval(() => {
      this.checkAndTriggerReminders();
    }, this.checkInterval);

    // Also check immediately
    this.checkAndTriggerReminders();
  }

  public stopReminderService(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.serviceInterval) {
      clearInterval(this.serviceInterval);
      this.serviceInterval = null;
    }

    // Cancel all scheduled reminders
    this.scheduledReminders.forEach((reminders) => {
      reminders.forEach((reminder) => {
        notificationService.cancelScheduledNotification(reminder.timeoutId);
      });
    });
    this.scheduledReminders.clear();
  }

  public scheduleEventReminders(event: IEvent): void {
    if (!event.reminders || event.reminders.useDefault) {
      return;
    }

    // Cancel existing reminders for this event
    this.cancelEventReminders(event.gEventId || event.id.toString());

    const eventTime = new Date(event.startDate);
    const now = new Date();
    
    // Only schedule reminders for future events
    if (eventTime <= now) {
      return;
    }

    const reminders: ScheduledReminder[] = [];

    if (event.reminders.overrides) {
      for (const reminder of event.reminders.overrides) {
        const reminderTime = new Date(eventTime.getTime() - (reminder.minutes * 60 * 1000));
        
        // Only schedule if reminder time is in the future
        if (reminderTime > now) {
          const reminderId = `${event.gEventId || event.id}-${reminder.minutes}-${reminder.method}`;
          
          const timeoutId = window.setTimeout(async () => {
            await this.triggerReminderNotification(event, reminder.minutes, reminder.method);
          }, reminderTime.getTime() - now.getTime());

          reminders.push({
            eventId: event.gEventId || event.id.toString(),
            reminderId,
            timeoutId,
            eventTitle: event.title,
            eventTime,
            reminderMinutes: reminder.minutes,
          });
        }
      }
    }

    if (reminders.length > 0) {
      this.scheduledReminders.set(event.gEventId || event.id.toString(), reminders);
    }
  }

  public cancelEventReminders(eventId: string): void {
    const reminders = this.scheduledReminders.get(eventId);
    if (reminders) {
      reminders.forEach((reminder) => {
        notificationService.cancelScheduledNotification(reminder.timeoutId);
      });
      this.scheduledReminders.delete(eventId);
    }
  }

  public updateEventReminders(event: IEvent): void {
    this.cancelEventReminders(event.gEventId || event.id.toString());
    this.scheduleEventReminders(event);
  }

  public isServiceRunning(): boolean {
    return this.isRunning;
  }

  private async checkAndTriggerReminders(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const now = new Date();
    const eventsToCheck: string[] = [];

    // Check all scheduled reminders
    this.scheduledReminders.forEach((reminders, eventId) => {
      const validReminders: ScheduledReminder[] = [];
      
      reminders.forEach((reminder) => {
        const reminderTime = new Date(reminder.eventTime.getTime() - (reminder.reminderMinutes * 60 * 1000));
        
        // If reminder time has passed, trigger it
        if (reminderTime <= now) {
          this.triggerReminderNotification(
            {
              id: parseInt(reminder.eventId) || 0,
              gEventId: reminder.eventId,
              title: reminder.eventTitle,
              startDate: reminder.eventTime.toISOString(),
              endDate: reminder.eventTime.toISOString(),
              color: 'blue',
              description: '',
              user: { id: 'default', name: 'Default User', picturePath: null },
            } as IEvent,
            reminder.reminderMinutes,
            'popup' // Default to popup for scheduled reminders
          );
        } else {
          validReminders.push(reminder);
        }
      });

      if (validReminders.length > 0) {
        this.scheduledReminders.set(eventId, validReminders);
      } else {
        eventsToCheck.push(eventId);
      }
    });

    // Clean up events with no valid reminders
    eventsToCheck.forEach((eventId) => {
      this.scheduledReminders.delete(eventId);
    });
  }

  private async triggerReminderNotification(
    event: IEvent,
    reminderMinutes: number,
    method: 'email' | 'popup'
  ): Promise<void> {
    const eventTime = new Date(event.startDate);
    const now = new Date();
    const timeUntilEvent = eventTime.getTime() - now.getTime();
    const minutesUntilEvent = Math.floor(timeUntilEvent / (1000 * 60));

    let title: string;
    let body: string;

    if (minutesUntilEvent <= 0) {
      title = 'Event Starting Now!';
      body = `${event.title} is starting now!`;
    } else if (minutesUntilEvent < 60) {
      title = 'Event Starting Soon';
      body = `${event.title} starts in ${minutesUntilEvent} minute${minutesUntilEvent === 1 ? '' : 's'}!`;
    } else {
      const hoursUntilEvent = Math.floor(minutesUntilEvent / 60);
      title = 'Upcoming Event';
      body = `${event.title} starts in ${hoursUntilEvent} hour${hoursUntilEvent === 1 ? '' : 's'}!`;
    }

    // Add reminder context
    if (reminderMinutes > 0) {
      body += ` (${reminderMinutes}-minute reminder)`;
    }

    await notificationService.showNotification({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      tag: `reminder-${event.gEventId || event.id}`,
      requireInteraction: true,
      data: {
        eventId: event.gEventId || event.id,
        eventTitle: event.title,
        eventTime: eventTime.toISOString(),
        reminderMinutes,
        method,
        type: 'calendar-reminder',
      },
    });

    // Reminder notification triggered
  }

  // Method to get all scheduled reminders (for debugging)
  public getScheduledReminders(): Map<string, ScheduledReminder[]> {
    return new Map(this.scheduledReminders);
  }

  // Method to get reminder count for an event
  public getEventReminderCount(eventId: string): number {
    const reminders = this.scheduledReminders.get(eventId);
    return reminders ? reminders.length : 0;
  }
}

// Export singleton instance
export const reminderNotificationService = new ReminderNotificationServiceImpl();

// Export the class for testing
export { ReminderNotificationServiceImpl };
