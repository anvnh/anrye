import { cva } from "class-variance-authority";
import { endOfDay, format, isSameDay, parseISO, startOfDay } from "date-fns";

import { useCalendar } from "../../contexts/CalendarContext";
import { getThemeAwareEventColors } from "../../styles/eventColors";
import { useThemeSettings } from "@/app/(home)/notes/_hooks";

import { EventDetailsDialog } from "../dialogs/EventDetailsDialog";

import { cn } from "@/lib/utils";

import type { IEvent } from "../../interfaces";
import type { VariantProps } from "class-variance-authority";

const eventBadgeVariants = cva(
  "mx-1 flex size-auto h-6.5 select-none items-center justify-between gap-1.5 truncate whitespace-nowrap rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      color: {
        // Colored and mixed variants
        blue: "",
        green: "",
        red: "",
        yellow: "",
        purple: "",
        orange: "",
        gray: "",

        // Dot variants
        "blue-dot": "",
        "green-dot": "",
        "red-dot": "",
        "yellow-dot": "",
        "purple-dot": "",
        "orange-dot": "",
        "gray-dot": "",
      },
      multiDayPosition: {
        first: "relative z-10 mr-0 w-[calc(100%_-_3px)] rounded-r-none border-r-0 [&>span]:mr-2.5",
        middle: "relative z-10 mx-0 w-[calc(100%_+_1px)] rounded-none border-x-0",
        last: "ml-0 rounded-l-none border-l-0",
        none: "",
      },
    },
    defaultVariants: {
      color: "blue-dot",
    },
  }
);

interface IProps extends Omit<VariantProps<typeof eventBadgeVariants>, "color" | "multiDayPosition"> {
  event: IEvent;
  cellDate: Date;
  eventCurrentDay?: number;
  eventTotalDays?: number;
  className?: string;
  position?: "first" | "middle" | "last" | "none";
}

export function MonthEventBadge({ event, cellDate, eventCurrentDay, eventTotalDays, className, position: propPosition }: IProps) {
  const { badgeVariant } = useCalendar();
  const { notesTheme } = useThemeSettings();

  const itemStart = startOfDay(parseISO(event.startDate));
  const itemEnd = endOfDay(parseISO(event.endDate));

  if (cellDate < itemStart || cellDate > itemEnd) return null;

  let position: "first" | "middle" | "last" | "none" | undefined;

  if (propPosition) {
    position = propPosition;
  } else if (eventCurrentDay && eventTotalDays) {
    position = "none";
  } else if (isSameDay(itemStart, itemEnd)) {
    position = "none";
  } else if (isSameDay(cellDate, itemStart)) {
    position = "first";
  } else if (isSameDay(cellDate, itemEnd)) {
    position = "last";
  } else {
    position = "middle";
  }

  const renderBadgeText = ["first", "none"].includes(position);

  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof eventBadgeVariants>["color"];
  const isLight = notesTheme === 'light';
  const dynamicVariants = getThemeAwareEventColors(isLight);

  const eventBadgeClasses = cn(
    eventBadgeVariants({ multiDayPosition: position }),
    dynamicVariants[color || "blue-dot"],
    className
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
    }
  };

  return (
    <EventDetailsDialog event={event}>
      <div role="button" tabIndex={0} className={eventBadgeClasses} onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-1.5 truncate">
          {!["middle", "last"].includes(position) && ["mixed", "dot"].includes(badgeVariant) && (
            <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
              <circle cx="4" cy="4" r="4" />
            </svg>
          )}

          {renderBadgeText && (
            <p className="flex-1 truncate font-semibold">
              {eventCurrentDay && (
                <span className="text-xs">
                  Day {eventCurrentDay} of {eventTotalDays} •{" "}
                </span>
              )}
              {event.title}
            </p>
          )}
        </div>

        {renderBadgeText && <span>{format(new Date(event.startDate), "h:mm a")}</span>}
      </div>
    </EventDetailsDialog>
  );
}
