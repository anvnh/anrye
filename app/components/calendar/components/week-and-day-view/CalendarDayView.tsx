import { Calendar, Clock, User } from "lucide-react";
import { parseISO, areIntervalsOverlapping, format } from "date-fns";

import { useCalendar } from "../../contexts/CalendarContext";

import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDayButton, Calendar as CalendarPicker } from "@/components/ui/calendar";

import { AddEventDialog } from "../dialogs/AddEventDialog";
import { EventBlock } from "./EventBlock";
import { DraggableEventBlock } from "./DraggableEventBlock";
import { CalendarTimeline } from "./CalendarTimeline";
import { DayViewMultiDayEventsRow } from "./DayViewMultiDayEventsRow";

import { cn } from "@/lib/utils";
import { groupEvents, getEventBlockStyle, isWorkingHour, getCurrentEvents, getVisibleHours } from "../../helpers";

import type { IEvent } from "../../interfaces";
import { useThemeSettings } from "@/app/(home)/notes/_hooks";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarDayView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, setSelectedDate, users, visibleHours, workingHours } = useCalendar();

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);

  const currentEvents = getCurrentEvents(singleDayEvents);

  const dayEvents = singleDayEvents.filter(event => {
    const eventDate = parseISO(event.startDate);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const groupedEvents = groupEvents(dayEvents);

  const { notesTheme } = useThemeSettings();

  return (
    <div className="flex">
      <div className="flex flex-1 flex-col">
        <div>
          <DayViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} />

          {/* Day header */}
          <div className={cn(
            "relative z-20 flex border-b", 
            notesTheme === "light" ? "" : "border-gray-700"
          )}>
            <div className="w-18"></div>
            <span className={cn(
              "flex-1 border-l py-2 text-center text-xs font-medium",
              notesTheme === "light" ? "" : "border-gray-700"
            )}>
              {format(selectedDate, "EE ")}
              <span className={cn(
                "font-semibold",
                notesTheme === "light" ? "text-foreground" : "text-white"
              )}>
                {format(selectedDate, "d")}
              </span>
            </span>
          </div>
        </div>

        <div className="flex overflow-auto min-h-0" style={{ height: 'calc(100vh - 130px)' }}>
          <div className="flex w-full">
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

            {/* Day grid */}
            <div className="relative flex-1">
              <div className={cn(
                "relative w-full border-l",
                notesTheme === "light" ? "" : "border-gray-700"
              )}>
                {hours.map((hour, index) => {
                  const isDisabled = !isWorkingHour(selectedDate, hour, workingHours);

                  return (
                    <div key={hour} className={cn("relative w-full", isDisabled && "bg-calendar-disabled-hour")} style={{ height: "96px" }}>
                      {index !== 0 && (
                        <div 
                          className={cn("pointer-events-none absolute inset-x-0 top-0 border-b", notesTheme === "light" ? "" : "border-gray-700")}
                        ></div>
                      )}
                    </div>
                  );
                })}

                {groupedEvents.map((group, groupIndex) =>
                  group.map(event => {
                    let style = getEventBlockStyle(event, selectedDate, groupIndex, groupedEvents.length, { from: earliestEventHour, to: latestEventHour });
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
                        day={selectedDate}
                        visibleHoursRange={{ from: earliestEventHour, to: latestEventHour }}
                        baseStyle={{ left: style.left, width: style.width }}
                      />
                    );
                  })
                )}
              </div>

              <CalendarTimeline 
                firstVisibleHour={earliestEventHour} 
                lastVisibleHour={latestEventHour} 
                visibleHours={visibleHours}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden w-64 divide-y border-l md:block">
        <CalendarPicker 
          // classNames={{
          // }}
          className={cn(
            "mx-auto w-fit",
            notesTheme === "light" ? "" : "bg-main"
          )}
          classNames={{
            today: "bg-[var(--calendar-button)] text-white rounded-md",
            button_previous: "hover:bg-[var(--calendar-button-hover)] hover:text-white p-1.5 rounded-md",
            button_next: "hover:bg-[var(--calendar-button-hover)] hover:text-white p-1.5 rounded-md",
          }}
          components={{
            DayButton: ({ className, ...props }) => (
              <CalendarDayButton
                {...props}
                className={cn(
                  className,
                  "data-[selected-single=true]:bg-[var(--calendar-button-active)] data-[selected-single=true]:text-white",
                  "hover:bg-[var(--calendar-button-hover)] hover:text-white",
                )}
              />
            )
          }}
          mode="single" selected={selectedDate} onSelect={setSelectedDate}
        />

        <div className="flex-1 space-y-3">
          {currentEvents.length > 0 ? (
            <div className="flex items-start gap-2 px-4 pt-4">
              <span className="relative mt-[5px] flex size-2.5">
                <span className="absolute inline-flex size-full anemate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-green-600"></span>
              </span>

              <p className="text-sm font-semibold text-foreground">Happening now</p>
            </div>
          ) : (
            <p className="p-4 text-center text-sm italic text-muted-foreground">
              No appointments or consultations at the moment
            </p>
          )}

          {/* {currentEvents.length > 0 && (
            <ScrollArea className="h-[422px] px-4" type="always">
              <div className="space-y-6 pb-4">
                {currentEvents.map(event => {
                  const user = users?.find(user => user.id === event.user.id);

                  return (
                    <div key={event.id} className="space-y-1.5">
                      <p className="line-clamp-2 text-sm font-semibold">{event.title}</p>

                      {user && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="size-3.5" />
                          <span className="text-sm">{user.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="size-3.5" />
                        <span className="text-sm">{format(new Date(), "MMM d, yyyy")}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span className="text-sm">
                          {format(parseISO(event.startDate), "h:mm a")} - {format(parseISO(event.endDate), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )} */}
        </div>
      </div>
    </div>
  );
}
