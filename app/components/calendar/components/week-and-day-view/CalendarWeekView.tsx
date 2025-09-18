import { startOfWeek, addDays, format, parseISO, isSameDay, areIntervalsOverlapping, isToday } from "date-fns";

import { useCalendar } from "../../contexts/CalendarContext";
import { useCallback, useRef, useState } from "react";

import { AddEventDialog } from "../dialogs/AddEventDialog";
import { EventBlock } from "./EventBlock";
import { DraggableEventBlock } from "./DraggableEventBlock";
import { CalendarTimeline } from "./CalendarTimeline";
import { WeekViewMultiDayEventsRow } from "./WeekViewMultiDayEventsRow";

import { cn } from "@/lib/utils";
import { groupEvents, getEventBlockStyle, isWorkingHour, getVisibleHours } from "../../helpers";

import type { IEvent } from "../../interfaces";
import { useThemeSettings } from "@/app/(home)/notes/hooks";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarWeekView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, workingHours, visibleHours } = useCalendar();
  const { notesTheme } = useThemeSettings();

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStartDate, setDialogStartDate] = useState<Date | undefined>(undefined);
  const [dialogStartTime, setDialogStartTime] = useState<{ hour: number; minute: number } | undefined>(undefined);

  const handleDayColumnClick = useCallback(
    (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore clicks on event blocks
      const target = e.target as HTMLElement;
      if (target.closest('[data-event-block="true"]')) return;

      // Check if any dialog is currently open (prevent multiple dialogs)
      const openDialogs = document.querySelectorAll('[role="dialog"]');
      if (openDialogs.length > 0) return;

      // Store references before setTimeout to prevent null issues
      const currentTarget = e.currentTarget;
      const clientY = e.clientY;

      // Add a small delay to prevent quick successive clicks from other dialogs
      setTimeout(() => {
        if (!currentTarget) return;
        
        const rect = currentTarget.getBoundingClientRect();
        const y = clientY - rect.top;

        const hourHeightPx = 96; // must match style used in hour rows
        const totalHours = hours.length;
        const totalHeight = totalHours * hourHeightPx;
        const clampedY = Math.max(0, Math.min(y, totalHeight - 1));

        const hourIndex = Math.floor(clampedY / hourHeightPx);
        const minuteWithinHour = ((clampedY % hourHeightPx) / hourHeightPx) * 60;

        // Round to nearest 30 minutes
        let roundedMinutes = Math.round(minuteWithinHour / 30) * 30;
        let carry = 0;
        if (roundedMinutes === 60) {
          roundedMinutes = 0;
          carry = 1;
        }

        const hour = hours[0] + hourIndex + carry;
        const minute = roundedMinutes;

        const startDate = new Date(day);
        startDate.setHours(hour, minute, 0, 0);

        setDialogStartDate(startDate);
        setDialogStartTime({ hour, minute });
        setDialogOpen(true);
      }, 100);
    },
    [hours]
  );

  return (
    <>
      <div className="flex flex-col items-center justify-center border-b py-4 text-sm text-muted-foreground sm:hidden">
        <p>Weekly view is not available on smaller devices.</p>
        <p>Please switch to daily or monthly view.</p>
      </div>

      <div className="hidden flex-col sm:flex">
        <div>
          <WeekViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} />

          {/* Week header */}
          <div className={cn(
              "relative z-20 flex border-b", 
              notesTheme === "light" ? "" : "border-gray-700"
          )}>
            <div className="w-18"></div>
            <div className={cn(
              "grid flex-1 grid-cols-7 divide-x border-l",
              notesTheme === "light" ? "" : "border-gray-700 divide-gray-700"
            )}>
              {weekDays.map((day, index) => (
                <span
                  key={index}
                  className={cn(
                    "py-2 text-center text-xs font-medium",
                    isToday(day)
                      ? cn(
                        "bg-main text-primary-foreground font-bold",
                        notesTheme === "light" ? "light-bg-calendar-button" : "bg-calendar-button"
                      )
                      : "text-muted-foreground"
                  )}
                >
                  {format(day, "EE")} <span className="font-semibold">{format(day, "d")}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex min-h-0" 
          style={{ 
            height: 'calc(100vh - 130px)'
          }}
        >
          {/* Hours column */}
          <div className="relative w-18 flex-shrink-0">
            {hours.map((hour, index) => (
              <div key={hour} className="relative" style={{ height: "96px" }}>
                <div className="absolute -top-3 right-2 flex h-6 items-center">
                  {index !== 0 && (
                    <span className="text-xs text-muted-foreground">
                      {hour === 24 ? "00:00" : format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div className="relative flex-1">
            <div ref={gridRef} className={cn(
              "calendar-week-grid grid grid-cols-7 divide-x border-l",
              notesTheme === "light" ? "" : "divide-gray-700 border-gray-700"
            )}>
              {weekDays.map((day, dayIndex) => {
                const dayEvents = singleDayEvents.filter(event => isSameDay(parseISO(event.startDate), day) || isSameDay(parseISO(event.endDate), day));
                const groupedEvents = groupEvents(dayEvents);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "relative",
                      isCurrentDay && "bg-primary/5"
                    )}
                    onClick={e => handleDayColumnClick(day, e)}
                  >
                    {hours.map((hour, index) => {
                      const isDisabled = !isWorkingHour(day, hour, workingHours);

                      return (
                        <div key={hour} className={cn("relative", isDisabled && "bg-calendar-disabled-hour")} style={{ height: "96px" }}>
                          {index !== 0 && <div className={cn(
                            "pointer-events-none absolute inset-x-0 top-0 border-b",
                            notesTheme === "light" ? "" : "border-gray-700"
                          )}></div>}
                        </div>
                      );
                    })}

                    {groupedEvents.map((group, groupIndex) =>
                      group.map(event => {
                        let style = getEventBlockStyle(event, day, groupIndex, groupedEvents.length, { from: earliestEventHour, to: latestEventHour });
                        const hasOverlap = groupedEvents.some(
                          (otherGroup, otherIndex) =>
                            otherIndex !== groupIndex &&
                            otherGroup.some(otherEvent =>
                              areIntervalsOverlapping(
                                { start: parseISO(event.startDate), end: parseISO(event.endDate) },
                                { start: parseISO(otherEvent.startDate), end: parseISO(otherEvent.endDate) }
                              )
                            )
                        );

                        if (!hasOverlap) style = { ...style, width: "100%", left: "0%" };

                        return (
                          <DraggableEventBlock
                            key={event.id}
                            event={event}
                            day={day}
                            visibleHoursRange={{ from: earliestEventHour, to: latestEventHour }}
                            baseStyle={{ left: style.left, width: style.width }}
                            horizontalWeekMeta={{ containerRef: gridRef, days: weekDays }}
                          />
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>

            <CalendarTimeline 
              firstVisibleHour={earliestEventHour} 
              lastVisibleHour={latestEventHour} 
              visibleHours={visibleHours}
            />
          </div>
          <AddEventDialog open={dialogOpen} onOpenChange={setDialogOpen} startDate={dialogStartDate} startTime={dialogStartTime} />
        </div>
      </div>
    </>
  );
}
