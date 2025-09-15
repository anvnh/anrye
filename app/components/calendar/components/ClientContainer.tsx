"use client";

import { useMemo } from "react";
import { isSameDay, parseISO, startOfWeek, endOfWeek } from "date-fns";

import { useCalendar } from "../contexts/CalendarContext";

import { CalendarHeader } from "./header/CalendarHeader";
import { CalendarYearView } from "./year-view/CalendarYearView";
import { CalendarMonthView } from "./month-view/CalendarMonthView";
import { CalendarAgendaView } from "./agenda-view/CalendarAgendaView";
import { CalendarDayView } from "./week-and-day-view/CalendarDayView";
import { CalendarWeekView } from "./week-and-day-view/CalendarWeekView";

import type { TCalendarView } from "../types";

interface IProps {
  view: TCalendarView;
  onViewChange?: (view: TCalendarView) => void;
  loading?: boolean;
  onDateChange?: (date: Date) => void;
  onClose?: () => void;
}

export function ClientContainer({ view, onViewChange, loading = false, onDateChange, onClose }: IProps) {
  const { selectedDate, events } = useCalendar();

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.startDate);
      const eventEndDate = parseISO(event.endDate);

      if (view === "year") {
        const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
        const yearEnd = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        const isInSelectedYear = eventStartDate <= yearEnd && eventEndDate >= yearStart;
        return isInSelectedYear;
      }

      if (view === "month" || view === "agenda") {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const isInSelectedMonth = eventStartDate <= monthEnd && eventEndDate >= monthStart;
        return isInSelectedMonth;
      }

      if (view === "week") {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);
        return eventStartDate <= weekEnd && eventEndDate >= weekStart;
      }

      if (view === "day") {
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);

        const isInSelectedDay = eventStartDate <= dayEnd && eventEndDate >= dayStart;
        return isInSelectedDay;
      }

      return false;
    });
  }, [events, selectedDate, view]);

  const singleDayEvents = filteredEvents.filter(event => {
    const startDate = parseISO(event.startDate);
    const endDate = parseISO(event.endDate);
    return isSameDay(startDate, endDate);
  });

  const multiDayEvents = filteredEvents.filter(event => {
    const startDate = parseISO(event.startDate);
    const endDate = parseISO(event.endDate);
    return !isSameDay(startDate, endDate);
  });

  // For year view, we only care about the start date
  // by using the same date for both start and end,
  // we ensure only the start day will show a dot
  const eventStartDates = useMemo(() => {
    return filteredEvents.map(event => ({ ...event, endDate: event.startDate }));
  }, [filteredEvents]);

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-xl border-none">
      <CalendarHeader view={view} events={filteredEvents} onViewChange={onViewChange} loading={loading} onDateChange={onDateChange} onClose={onClose} />

      <div className="flex-1 overflow-auto">
        {view === "day" && <CalendarDayView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} onDateChange={onDateChange} />}
        {view === "month" && <CalendarMonthView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "week" && <CalendarWeekView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "year" && <CalendarYearView allEvents={eventStartDates} />}
        {view === "agenda" && <CalendarAgendaView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
      </div>
    </div>
  );
}
