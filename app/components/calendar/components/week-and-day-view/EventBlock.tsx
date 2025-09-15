import { cva } from "class-variance-authority";
import { format, differenceInMinutes, parseISO } from "date-fns";

import { useCalendar } from "../../contexts/CalendarContext";
import { useThemeSettings } from "@/app/(home)/notes/_hooks";
import { getThemeAwareEventColors } from "../../styles/eventColors";

import { EventDetailsDialog } from "../dialogs/EventDetailsDialog";

import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";
import type { IEvent } from "../../interfaces";
import type { VariantProps } from "class-variance-authority";

const calendarWeekEventCardVariants = cva(
  "flex select-none flex-col gap-0.5 truncate whitespace-nowrap rounded-md border px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
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
        "orange-dot": "",
        "purple-dot": "",
        "yellow-dot": "",
        "gray-dot": "",
      },
    },
    defaultVariants: {
      color: "blue-dot",
    },
  }
);

interface IProps extends HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof calendarWeekEventCardVariants>, "color"> {
  event: IEvent;
}

export function EventBlock({ event, className }: IProps) {
  const { badgeVariant } = useCalendar();
  const { notesTheme } = useThemeSettings();

  const start = parseISO(event.startDate);
  const end = parseISO(event.endDate);
  const durationInMinutes = differenceInMinutes(end, start);
  const heightInPixels = (durationInMinutes / 60) * 96 - 8;

  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof calendarWeekEventCardVariants>["color"];
  const isLight = notesTheme === 'light';
  const dynamicVariants = getThemeAwareEventColors(isLight);

  const calendarWeekEventCardClasses = cn(
    "flex select-none flex-col gap-0.5 truncate whitespace-nowrap rounded-md border px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    dynamicVariants[color || "blue-dot"],
    className,
    durationInMinutes < 35 && "py-0 justify-center"
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
    }
  };

  return (
    <EventDetailsDialog event={event}>
      <div role="button" tabIndex={0} className={calendarWeekEventCardClasses} style={{ height: `${heightInPixels}px` }} onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-1.5 truncate">
          {["mixed", "dot"].includes(badgeVariant) && (
            <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
              <circle cx="4" cy="4" r="4" />
            </svg>
          )}

          <p className="truncate font-semibold">{event.title}</p>
        </div>

        {durationInMinutes > 25 && (
          <p>
            {format(start, "h:mm a")} - {format(end, "h:mm a")}
          </p>
        )}
      </div>
    </EventDetailsDialog>
  );
}
