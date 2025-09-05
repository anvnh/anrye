import { cva } from "class-variance-authority";
import { format, differenceInMinutes, parseISO } from "date-fns";

import { useCalendar } from "../../contexts/CalendarContext";
import { useThemeSettings } from "@/app/(home)/notes/_hooks";

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

  // Create dynamic color variants based on current theme
  const getDynamicColorVariants = () => {
    const isLight = notesTheme === 'light';
    
    return {
      // Colored variants with theme-aware colors
      blue: isLight 
        ? "border-blue-200 bg-blue-50 text-blue-700 [&_.event-dot]:fill-blue-600" 
        : "border-blue-800 bg-[#93C5FD] text-black [&_.event-dot]:fill-blue-400",
      green: isLight 
        ? "border-green-200 bg-green-50 text-green-700 [&_.event-dot]:fill-green-600" 
        : "border-green-800 bg-[#86EFAC] text-black [&_.event-dot]:fill-green-400",
      red: isLight 
        ? "border-red-200 bg-red-50 text-red-700 [&_.event-dot]:fill-red-600" 
        : "border-red-800 bg-[#FCA5A5] text-black [&_.event-dot]:fill-red-400",
      yellow: isLight 
        ? "border-yellow-200 bg-yellow-50 text-yellow-700 [&_.event-dot]:fill-yellow-600" 
        : "border-yellow-800 bg-[#FDE68A] text-black [&_.event-dot]:fill-yellow-400",
      purple: isLight 
        ? "border-purple-200 bg-purple-50 text-purple-700 [&_.event-dot]:fill-purple-600" 
        : "border-purple-800 bg-[#CBAACB] text-black [&_.event-dot]:fill-purple-400",
      orange: isLight 
        ? "border-orange-200 bg-orange-50 text-orange-700 [&_.event-dot]:fill-orange-600" 
        : "border-orange-800 bg-[#FDBA74] text-black [&_.event-dot]:fill-orange-400",
      gray: isLight 
        ? "border-neutral-200 bg-neutral-50 text-neutral-700 [&_.event-dot]:fill-neutral-600" 
        : "border-neutral-700 bg-[#CBD5E1] text-black [&_.event-dot]:fill-neutral-400",

      // Dot variants with theme-aware backgrounds
      "blue-dot": isLight 
        ? "bg-neutral-50 [&_.event-dot]:fill-blue-600" 
        : "bg-neutral-900 [&_.event-dot]:fill-blue-400",
      "green-dot": isLight 
        ? "bg-neutral-50 [&_.event-dot]:fill-green-600" 
        : "bg-neutral-900 [&_.event-dot]:fill-green-400",
      "red-dot": isLight 
        ? "bg-neutral-50 [&_.event-dot]:fill-red-600" 
        : "bg-neutral-900 [&_.event-dot]:fill-red-400",
      "orange-dot": isLight 
        ? "bg-neutral-50 [&_.event-dot]:fill-orange-600" 
        : "bg-neutral-900 [&_.event-dot]:fill-orange-400",
      "purple-dot": isLight 
        ? "bg-neutral-50 [&_.event-dot]:fill-purple-600" 
        : "bg-neutral-900 [&_.event-dot]:fill-purple-400",
      "yellow-dot": isLight 
        ? "bg-neutral-50 [&_.event-dot]:fill-yellow-600" 
        : "bg-neutral-900 [&_.event-dot]:fill-yellow-400",
      "gray-dot": isLight 
        ? "bg-neutral-50 [&_.event-dot]:fill-neutral-600" 
        : "bg-neutral-900 [&_.event-dot]:fill-neutral-400",
    };
  };

  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof calendarWeekEventCardVariants>["color"];
  const dynamicVariants = getDynamicColorVariants();

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
