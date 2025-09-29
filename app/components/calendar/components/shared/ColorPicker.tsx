"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ColorOption {
  value: string;
  label: string;
  color: string;
}

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  notesTheme?: "light" | "dark";
}

const colorOptions: ColorOption[] = [
  { value: "blue", label: "Blue", color: "bg-blue-600" },
  { value: "green", label: "Green", color: "bg-green-600" },
  { value: "red", label: "Red", color: "bg-red-600" },
  { value: "yellow", label: "Yellow", color: "bg-yellow-600" },
  { value: "purple", label: "Purple", color: "bg-purple-600" },
  { value: "orange", label: "Orange", color: "bg-orange-600" },
  { value: "gray", label: "Gray", color: "bg-neutral-600" },
];

export function ColorPicker({ value, onChange, className, notesTheme = "dark" }: ColorPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-4 gap-2">
        {colorOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-2 p-1.5 rounded-lg transition-all duration-200 hover:scale-105",
              value === option.value
                ? notesTheme === "light" 
                  ? "bg-blue-100 text-blue-900" 
                  : "bg-blue-900/40 text-blue-100"
                : notesTheme === "light" 
                  ? "bg-gray-50 text-gray-700 hover:bg-gray-100" 
                  : "bg-calendar-button text-white hover:bg-gray-700"
            )}
          >
            <div className={cn("size-4 rounded-full", option.color)} />
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
