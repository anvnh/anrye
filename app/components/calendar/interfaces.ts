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
}

export interface ICalendarCell {
  day: number;
  currentMonth: boolean;
  date: Date;
}
