"use client";

import React from "react";
import { TimeInput } from "@/components/ui/time-input";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { UseFormReturn } from "react-hook-form";
import type { TimeValue } from "react-aria-components";
import type { TEventFormData } from "../../schemas";

interface TimeInputsProps {
  form: UseFormReturn<TEventFormData>;
  onStartTimeChange?: (value: any) => void;
  onEndTimeChange?: (value: any) => void;
  className?: string;
}

export function TimeInputs({ 
  form, 
  onStartTimeChange,
  onEndTimeChange,
  className 
}: TimeInputsProps) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      {/* Start Time */}
      <FormField
        control={form.control}
        name="startTime"
        render={({ field, fieldState }) => (
          <FormItem className="flex-1">
            <FormControl>
              <TimeInput
                className="[&_[data-focus-within]]:ring-0 [&_[data-focus-within]]:outline-none"
                value={field.value as TimeValue}
                onChange={value => {
                  field.onChange(value);
                  onStartTimeChange?.(value);
                }}
                hourCycle={24}
                data-invalid={fieldState.invalid}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* End Time */}
      <FormField
        control={form.control}
        name="endTime"
        render={({ field, fieldState }) => (
          <FormItem className="flex-1">
            <FormControl>
              <TimeInput
                className={cn(
                  "border-gray-600",
                  "[&_[data-focus-within]]:ring-0 [&_[data-focus-within]]:outline-none"
                )}
                value={field.value as TimeValue}
                onChange={value => {
                  field.onChange(value);
                  onEndTimeChange?.(value);
                }} 
                hourCycle={24} 
                data-invalid={fieldState.invalid}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
