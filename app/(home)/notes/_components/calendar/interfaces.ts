import type { TEventColor } from "@/app/(home)/notes/_components/calendar/types";

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
}

export interface ICalendarCell {
  day: number;
  currentMonth: boolean;
  date: Date;
}
