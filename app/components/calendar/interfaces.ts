import type { TEventColor } from "@/app/components/calendar/types";

export interface IUser {
  id: string;
  name: string;
  picturePath: string | null;
}

export interface IEvent {
  id: number;
  /** Original Google Calendar event id (string) */
  gEventId?: string;
  startDate: string;
  endDate: string;
  title: string;
  color: TEventColor;
  description: string;
  user: IUser;
  // Recurrence metadata (optional, present when sourced from Google Calendar API)
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: string;
  // Reminders metadata (optional, present when sourced from Google Calendar API)
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface ICalendarCell {
  day: number;
  currentMonth: boolean;
  date: Date;
}
