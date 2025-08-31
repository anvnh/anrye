"use client";

import { useCalendar } from "../contexts/CalendarContext";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useThemeSettings } from "../../../(home)/notes/_hooks";
import { cn } from "@/lib/utils";

export function ChangeBadgeVariantInput() {
  const { badgeVariant, setBadgeVariant } = useCalendar();
  const { notesTheme } = useThemeSettings();

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Change badge variant</p>

      <Select value={badgeVariant} onValueChange={setBadgeVariant}>
        <SelectTrigger className="w-48 border-gray-600">
          <SelectValue />
        </SelectTrigger>

        <SelectContent className={cn(
          "z-[9999]",
          notesTheme === "light" ? "light-bg-calendar-button text-black hover:light-bg-calendar-button" : "bg-calendar-button text-white"
        )} position="popper" side="top" align="center">
          <SelectItem value="dot">Dot</SelectItem>
          <SelectItem value="colored">Colored</SelectItem>
          <SelectItem value="mixed">Mixed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
