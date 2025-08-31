import Link from "next/link";
import { Columns, Grid3x3, List, Plus, Grid2x2, CalendarRange, Loader2, Settings, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { TodayButton } from "./TodayButton";
import { DateNavigator } from "./DateNavigator";
import { AddEventDialog } from "../dialogs/AddEventDialog";
import { ChangeBadgeVariantInput } from "../ChangeBadgeVariantInput";

import type { IEvent } from "../../interfaces";
import type { TCalendarView } from "../../types";

import { useThemeSettings } from "@/app/(home)/notes/_hooks";
import { cn } from "@/lib/utils";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
  onViewChange?: (view: TCalendarView) => void;
  loading?: boolean;
  onDateChange?: (date: Date) => void;
  onClose?: () => void;
}

export function CalendarHeader({ view, events, onViewChange, loading = false, onDateChange, onClose }: IProps) {

  const { notesTheme } = useThemeSettings();

  return (
    <div className={cn(
      "flex flex-col gap-4 p-4 border-b lg:flex-row lg:items-center lg:justify-between",
      notesTheme === "light" ? "" : "border-gray-700"
    )}>
      <div className="flex items-center gap-3">
        <TodayButton />
        <DateNavigator view={view} events={events} onDateChange={onDateChange} />
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
        <div className="flex w-full items-center gap-1.5">
          <div className="inline-flex first:rounded-r-none last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none">
            <Button
              aria-label="View by day"
              size="icon"
              variant={view === "day" ? (notesTheme === "light" ? "light" : "dark") : notesTheme === "light" ? "light-outline" : "dark-outline"}
              className="rounded-r-none [&_svg]:size-5"
              onClick={() => onViewChange?.("day")}
              title="View by day"
            >
              <List strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by week"
              size="icon"
              variant={view === "week" ? (notesTheme === "light" ? "light" : "dark") : notesTheme === "light" ? "light-outline" : "dark-outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
              onClick={() => onViewChange?.("week")}
              title="View by week"
            >
              <Columns strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by month"
              size="icon"
              variant={view === "month" ? (notesTheme === "light" ? "light" : "dark") : notesTheme === "light" ? "light-outline" : "dark-outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
              onClick={() => onViewChange?.("month")}
              title="View by month"
            >
              <Grid2x2 strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by year"
              size="icon"
              variant={view === "year" ? (notesTheme === "light" ? "light" : "dark") : notesTheme === "light" ? "light-outline" : "dark-outline"}
              className="-ml-px rounded-none [&_svg]:size-5"
              onClick={() => onViewChange?.("year")}
              title="View by year"
            >
              <Grid3x3 strokeWidth={1.8} />
            </Button>

            <Button
              aria-label="View by agenda"
              size="icon"
              variant={view === "agenda" ? (notesTheme === "light" ? "light" : "dark") : notesTheme === "light" ? "light-outline" : "dark-outline"}
              className="-ml-px rounded-l-none [&_svg]:size-5"
              onClick={() => onViewChange?.("agenda")}
              title="View by agenda"
            >
              <CalendarRange strokeWidth={1.8} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge Variant Settings */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={notesTheme === "light" ? "light-outline" : "outline"} size="icon" className="h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className={cn(
              "w-80 z-[9998] relative border-none",
              notesTheme === "light" ? "light-bg-calendar-button text-black" : "bg-calendar-button text-white"
            )} align="end" side="bottom">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">
                  Calendar Settings
                </h4>
                <ChangeBadgeVariantInput />
              </div>
            </PopoverContent>
          </Popover>

          {/* Add Event Button */}
          <AddEventDialog>
            <Button className={cn(
              notesTheme === "light" 
                ? "light-bg-calendar-button-with-hover text-black" 
                : "bg-calendar-button text-white"
            )}>
              <Plus />
              Add Event
            </Button>
          </AddEventDialog>

          {/* Close Button */}
          {onClose && (
            <Button
              onClick={onClose}
              variant={notesTheme === "light" ? "light-outline" : "outline"}
              size="icon"
              className="h-9 w-9"
              title="Close Calendar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
