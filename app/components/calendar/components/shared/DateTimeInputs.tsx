"use client";

import React from "react";
import { CalendarSelect } from "./CalendarSelect";
import { TimeInputs } from "./TimeInputs";
import { UseFormReturn } from "react-hook-form";
import type { TEventFormData } from "../../schemas";

interface DateTimeInputsProps {
  form: UseFormReturn<TEventFormData>;
  notesTheme: "light" | "dark";
  onStartDateChange?: (date: Date) => void;
  onStartTimeChange?: (value: any) => void;
  onEndTimeChange?: (value: any) => void;
  className?: string;
}

export function DateTimeInputs({ 
  form, 
  notesTheme,
  onStartDateChange,
  onStartTimeChange,
  onEndTimeChange,
  className 
}: DateTimeInputsProps) {
  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <CalendarSelect
          form={form}
          name="startDate"
          notesTheme={notesTheme}
          onDateChange={onStartDateChange}
          placeholder="Select a date"
        />
        
        <TimeInputs
          form={form}
          onStartTimeChange={onStartTimeChange}
          onEndTimeChange={onEndTimeChange}
        />
      </div>

    </div>
  );
}
