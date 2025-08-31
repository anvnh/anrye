import { formatDate } from "date-fns";

import { useCalendar } from "../../contexts/CalendarContext";

import { useThemeSettings } from "@/app/(home)/notes/_hooks";
import { cn } from "@/lib/utils";

export function TodayButton() {
  const { setSelectedDate } = useCalendar();

  const today = new Date();
  const handleClick = () => setSelectedDate(today);
  const { notesTheme } = useThemeSettings();

  return (
    <button
      className={`flex size-14 flex-col items-start overflow-hidden rounded-lg border border-gray-600`}
      onClick={handleClick}
    >
      <p className={cn(
        "flex h-6 w-full items-center justify-center text-center text-xs font-semibold",
        notesTheme === "light" ? "bg-secondary text-white" : "bg-calendar-button text-white"
      )}>
        {formatDate(today, "MMM").toUpperCase()}
      </p>
      <p className={cn(
        "flex w-full items-center justify-center text-lg font-bold",
        notesTheme === "dark" ? "text-white" : "text-primary"
      )}>{today.getDate()}</p>
    </button>
  );
}
