"use client";

import React from "react";
import { SingleDayPicker } from "@/components/ui/single-day-picker";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";
import type { TEventFormData } from "../../schemas";

interface CalendarSelectProps {
  form: UseFormReturn<TEventFormData>;
  name: "startDate" | "endDate";
  notesTheme: "light" | "dark";
  onDateChange?: (date: Date) => void;
  placeholder?: string;
  className?: string;
}

export function CalendarSelect({ 
  form, 
  name, 
  notesTheme, 
  onDateChange,
  placeholder = "Select a date",
  className 
}: CalendarSelectProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn("flex-1", className)}>
          <FormControl>
            <SingleDayPicker
              id={name}
              value={field.value}
              className={cn(
                notesTheme === "light" ? "bg-white" : "bg-calendar-button"
              )}
              onSelect={date => {
                field.onChange(date as Date);
                onDateChange?.(date as Date);
              }}
              placeholder={placeholder}
              data-invalid={fieldState.invalid}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
