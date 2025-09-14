import { useMemo } from "react";
import { formatDate } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCalendar } from "../../contexts/CalendarContext";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { navigateDate, rangeText } from "../../helpers";

import type { IEvent } from "../../interfaces";
import type { TCalendarView } from "../../types";
import { useThemeSettings } from "@/app/(home)/notes/_hooks";
import { cn } from "@/lib/utils";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
  onDateChange?: (date: Date) => void;
}

export function DateNavigator({ view, events, onDateChange }: IProps) {
  const { selectedDate, setSelectedDate } = useCalendar();
  const { notesTheme } = useThemeSettings();

  const month = formatDate(selectedDate, "MMMM");
  const year = selectedDate.getFullYear();


  const handlePrevious = () => {
    const newDate = navigateDate(selectedDate, view, "previous");
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };
  
  const handleNext = () => {
    const newDate = navigateDate(selectedDate, view, "next");
    setSelectedDate(newDate);
    onDateChange?.(newDate);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">
          {month} {year}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          className={cn(
            "size-6.5 px-0 [&_svg]:size-4.5",
            notesTheme === "light" ? "light-bg-calendar-button-with-hover text-black" : "bg-calendar-button text-white"
          )} 


          onClick={handlePrevious}
        >
          <ChevronLeft />
        </Button>

        <p className="text-sm text-muted-foreground">{rangeText(view, selectedDate)}</p>

        <Button 
          variant="outline" 
          className={cn(
            "size-6.5 px-0 [&_svg]:size-4.5",
            notesTheme === "light" ? "light-bg-calendar-button-with-hover text-black" : "bg-calendar-button-with-hover text-white"
          )} 
          onClick={handleNext}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
