'use client';

import { useEffect, useCallback, useState } from 'react';
import { reminderNotificationService } from '../reminderNotificationService';
import type { IEvent } from '@/app/components/calendar/interfaces';

interface UseReminderNotificationsReturn {
  isServiceRunning: boolean;
  startReminderService: () => void;
  stopReminderService: () => void;
  scheduleEventReminders: (event: IEvent) => void;
  cancelEventReminders: (eventId: string) => void;
  updateEventReminders: (event: IEvent) => void;
  getScheduledReminders: () => Map<string, any[]>;
  getEventReminderCount: (eventId: string) => number;
}

export function useReminderNotifications(): UseReminderNotificationsReturn {
  const [isServiceRunning, setIsServiceRunning] = useState(false);

  const startReminderService = useCallback(() => {
    reminderNotificationService.startReminderService();
    setIsServiceRunning(true);
  }, []);

  const stopReminderService = useCallback(() => {
    reminderNotificationService.stopReminderService();
    setIsServiceRunning(false);
  }, []);

  const scheduleEventReminders = useCallback((event: IEvent) => {
    reminderNotificationService.scheduleEventReminders(event);
  }, []);

  const cancelEventReminders = useCallback((eventId: string) => {
    reminderNotificationService.cancelEventReminders(eventId);
  }, []);

  const updateEventReminders = useCallback((event: IEvent) => {
    reminderNotificationService.updateEventReminders(event);
  }, []);

  const getScheduledReminders = useCallback(() => {
    return reminderNotificationService.getScheduledReminders();
  }, []);

  const getEventReminderCount = useCallback((eventId: string) => {
    return reminderNotificationService.getEventReminderCount(eventId);
  }, []);

  // Auto-start service when hook is used
  useEffect(() => {
    if (!isServiceRunning) {
      startReminderService();
    }

    // Cleanup on unmount
    return () => {
      if (isServiceRunning) {
        stopReminderService();
      }
    };
  }, [isServiceRunning, startReminderService, stopReminderService]);

  return {
    isServiceRunning,
    startReminderService,
    stopReminderService,
    scheduleEventReminders,
    cancelEventReminders,
    updateEventReminders,
    getScheduledReminders,
    getEventReminderCount,
  };
}
