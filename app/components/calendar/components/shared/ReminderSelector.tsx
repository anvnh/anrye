"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReminderOverride {
  minutes: number;
}

interface ReminderSelectorProps {
  value?: {
    useDefault: boolean;
    overrides?: ReminderOverride[];
  };
  onChange: (value: {
    useDefault: boolean;
    overrides?: ReminderOverride[];
  }) => void;
  notesTheme: 'light' | 'dark';
}

const REMINDER_PRESETS = [
  { label: "5 minutes before", minutes: 5 },
  { label: "10 minutes before", minutes: 10 },
  { label: "15 minutes before", minutes: 15 },
  { label: "45 minutes before", minutes: 45 },
  { label: "1 hour before", minutes: 60 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 day before", minutes: 1440 },
  { label: "1 week before", minutes: 10080 },
];

// Convert time value and unit to minutes
const convertToMinutes = (value: number, unit: string): number => {
  switch (unit) {
    case 'minutes':
      return value;
    case 'hours':
      return value * 60;
    case 'days':
      return value * 24 * 60;
    case 'weeks':
      return value * 7 * 24 * 60;
    default:
      return value;
  }
};

export function ReminderSelector({ value, onChange, notesTheme }: ReminderSelectorProps) {
  const [customMinutes, setCustomMinutes] = useState<string>("");

  const handleUseDefaultChange = (useDefault: boolean) => {
    onChange({
      useDefault,
      overrides: useDefault ? undefined : (value?.overrides || []),
    });
  };

  const addReminder = (minutes: number) => {
    const currentOverrides = value?.overrides || [];
    if (currentOverrides.length >= 5) return; // Google Calendar limit
    
    const newOverride: ReminderOverride = { minutes };
    onChange({
      useDefault: false,
      overrides: [...currentOverrides, newOverride],
    });
  };

  const removeReminder = (index: number) => {
    const currentOverrides = value?.overrides || [];
    const newOverrides = currentOverrides.filter((_, i) => i !== index);
    onChange({
      useDefault: false,
      overrides: newOverrides.length > 0 ? newOverrides : undefined,
    });
  };


  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Reminders
        </Label>
        <RadioGroup
          value={value?.useDefault ? "default" : "custom"}
          onValueChange={(val) => handleUseDefaultChange(val === "default")}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="default" id="use-default" />
            <Label htmlFor="use-default" className="text-sm font-normal cursor-pointer">
              Use calendar default reminders
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="use-custom" />
            <Label htmlFor="use-custom" className="text-sm font-normal cursor-pointer">
              Set custom reminders
            </Label>
          </div>
        </RadioGroup>
      </div>

      {!value?.useDefault && (
        <div className="space-y-3">
          {value?.overrides?.map((reminder, index) => (
            <div key={index} className={cn(
              "flex items-center justify-between p-2 rounded-xl", 
              notesTheme === 'light' ? 'bg-gray-100' : 'bg-secondary'
            )}>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  Notification
                </span>
                <span className="text-sm text-gray-100">
                  {formatMinutes(reminder.minutes)} before
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeReminder(index)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add new reminder */}
          {(!value?.overrides || value.overrides.length < 5) && (
            <div className="space-y-4">
              <div className="flex w-full items-center space-x-2">
                <div className={cn(
                  "flex w-full space-x-8 items-center justify-start",
                  notesTheme === 'light' 
                    ? 'border-gray-300 bg-white' 
                    : 'border-gray-600 bg-main'
                )}>
                  <span className="text-sm font-normal">
                    Notification
                  </span>
                  
                  {/* Time input */}
                  <Input
                    type="number"
                    placeholder="30"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    min="1"
                    max="999"
                    className={cn(
                      "w-16 h-6 text-center text-sm border-0 px-1 py-1 focus:outline-none",
                      notesTheme === 'light' 
                        ? 'text-black' 
                        : 'text-white'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customMinutes) {
                        const timeValue = parseInt(customMinutes) || 30;
                        const minutes = convertToMinutes(timeValue, 'minutes'); // Default to minutes
                        addReminder(minutes);
                        setCustomMinutes("");
                      }
                    }}
                  />
                  
                  {/* Unit dropdown */}
                  <Select
                    onValueChange={(unit) => {
                      const timeValue = parseInt(customMinutes) || 30;
                      const minutes = convertToMinutes(timeValue, unit);
                      addReminder(minutes);
                      setCustomMinutes("");
                    }}
                  >
                    <SelectTrigger className={cn(
                      "px-1 text-sm border-0 w-fit",
                      notesTheme === 'light' 
                        ? 'bg-transparent text-black hover:bg-gray-100' 
                        : 'bg-transparent text-white hover:bg-gray-700'
                    )}>
                      <SelectValue placeholder="min" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      "z-100 min-w-[6rem] overflow-hidden rounded-md border shadow-md",
                      notesTheme === 'light' 
                        ? 'bg-white text-black border-gray-200' 
                        : 'bg-main text-white border-gray-700'
                    )}>
                      <SelectItem 
                        value="minutes"
                        className={cn(
                          "cursor-pointer text-sm",
                          notesTheme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
                        )}
                      >
                        minutes
                      </SelectItem>
                      <SelectItem 
                        value="hours"
                        className={cn(
                          "cursor-pointer text-sm",
                          notesTheme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
                        )}
                      >
                        hours
                      </SelectItem>
                      <SelectItem 
                        value="days"
                        className={cn(
                          "cursor-pointer text-sm",
                          notesTheme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
                        )}
                      >
                        days
                      </SelectItem>
                      <SelectItem 
                        value="weeks"
                        className={cn(
                          "cursor-pointer text-sm",
                          notesTheme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-gray-700'
                        )}
                      >
                        weeks
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1">
                {REMINDER_PRESETS.map((preset) => (
                  <Button
                    key={preset.minutes}
                    type="button"
                    variant={notesTheme === 'light' ? 'light-outline' : 'dark-outline'}
                    size="sm"
                    onClick={() => addReminder(preset.minutes)}
                    className="text-[13px]"
                    disabled={value?.overrides && value.overrides.length >= 5}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

            </div>
          )}

          {value?.overrides && value.overrides.length >= 5 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Maximum 5 reminders allowed
            </p>
          )}
        </div>
      )}
    </div>
  );
}
