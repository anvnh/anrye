import React, { useMemo } from "react";
import { isToday, startOfDay } from "date-fns";

import { EventBullet } from "./EventBullet";
import { MonthEventBadge } from "./MonthEventBadge";

import { cn } from "@/lib/utils";
import { getMonthCellEvents } from "../../helpers";
import { useThemeSettings } from "@/app/(home)/notes/_hooks";

import type { ICalendarCell, IEvent } from "../../interfaces";

interface IProps {
  cell: ICalendarCell;
  events: IEvent[];
  eventPositions: Record<string, number>;
  cellIndex: number;
}

export const DayCell = React.memo(function DayCell({ cell, events, eventPositions, cellIndex }: IProps) {
  const { day, currentMonth, date } = cell;
  const { notesTheme } = useThemeSettings();

  const cellEvents = useMemo(() => getMonthCellEvents(date, events, eventPositions), [date, events, eventPositions]);
  const isSunday = date.getDay() === 0;
  const isFirstRow = cellIndex < 7; // First 7 cells are in the first row

  return (
    <div className={cn(
      "flex h-full flex-col gap-1 py-1.5 lg:py-2",
      !isFirstRow && (notesTheme === "light" ? "border-t border-gray-200" : "border-t border-gray-700")
    )}>
      <span
        className={cn(
          "h-6 px-1 text-xs font-semibold lg:px-2",
          !currentMonth && "opacity-20",
          isToday(date) && "flex w-6 translate-x-1 items-center justify-center rounded-full bg-primary px-0 font-bold text-primary-foreground"
        )}
      >
        {day}
      </span>

      <div className={cn(
        "flex h-6 gap-1 px-2 lg:h-[94px] lg:flex-col lg:gap-2 lg:px-0 overflow-y-auto", 
        !currentMonth && "opacity-50"
      )}>
        {cellEvents.map((event, index) => (
          <div key={`event-${event.id}-${index}`} className="lg:flex-1 flex-shrink-0">
            <EventBullet className="lg:hidden" color={event.color} />
            <MonthEventBadge className="hidden lg:flex" event={event} cellDate={startOfDay(date)} />
          </div>
        ))}
      </div>
    </div>
  );
});
