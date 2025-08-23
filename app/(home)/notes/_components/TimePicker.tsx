"use client"

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useThemeSettings } from '../_hooks';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { notesTheme } = useThemeSettings();

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label className={notesTheme === 'light' ? 'text-white' : 'text-gray-300'}>{label}</Label>}
      <div className="relative">
        <Input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`bg-main text-white ${notesTheme === 'light' ? 'bg-white text-black' : ''} pr-10 text-center hover:border-gray-600 focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Clock
            size={16}
            className={`transition-colors ${isFocused
              ? 'text-blue-500'
              : 'text-gray-400'
              }`}
          />
        </div>
      </div>
    </div>
  );
};
