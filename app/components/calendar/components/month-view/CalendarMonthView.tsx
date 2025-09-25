import React, { useMemo } from "react";

import { useCalendar } from "../../contexts/CalendarContext";

import { DayCell } from "./DayCell";

import { getCalendarCells, calculateMonthEventPositions } from "../../helpers";
import { useThemeSettings } from "@/app/(home)/notes/hooks";
import { cn } from "@/lib/utils";

import type { IEvent } from "../../interfaces";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

const week_days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CalendarMonthView = React.memo(function CalendarMonthView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate } = useCalendar();
  const { notesTheme } = useThemeSettings();

  const allEvents = [...multiDayEvents, ...singleDayEvents];

  const cells = useMemo(() => getCalendarCells(selectedDate), [selectedDate]);

  const eventPositions = useMemo(
    () => calculateMonthEventPositions(multiDayEvents, singleDayEvents, selectedDate),
    [multiDayEvents, singleDayEvents, selectedDate]
  );

  return (
    <div>
      <div className={cn(
        "grid grid-cols-7 divide-x border-l border-t border-b",
        notesTheme === "light" ? "" : "divide-gray-700 border-gray-700"
      )}>
        {week_days.map(day => (
          <div key={day} className="flex items-center justify-center py-2">
            <span className="text-xs font-medium text-muted-foreground">{day}</span>
          </div>
        ))}
      </div>

      <div className={cn(
        "grid grid-cols-7 overflow-hidden border-l divide-x",
        notesTheme === "light" ? "" : "border-gray-700 divide-gray-700"
      )}>
        {cells.map((cell, index) => (
          <DayCell 
            key={cell.date.toISOString()} 
            cell={cell} 
            events={allEvents} 
            eventPositions={eventPositions}
            cellIndex={index}
          />
        ))}
      </div>
    </div>
  );
});
