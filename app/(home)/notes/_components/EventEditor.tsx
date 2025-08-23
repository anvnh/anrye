'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { TimePicker } from './TimePicker';
import { useThemeSettings } from '../_hooks';

type Props = {
  open: boolean;
  onClose: () => void;
  initialStart: Date;
  initialEnd: Date;
  initialTitle?: string;
  initialColorId?: string;
  onSave: (data: { title: string; start: Date; end: Date; colorId?: string; recurrence?: string | null }) => Promise<void> | void;
};

// Google calendar color swatches (colorId -> hex). These are common defaults.
export const DARK_COLOR_MAP: Record<string, string> = {
  '1': '#89B4FA', // Blue
  '2': '#A6E3A1', // Green
  '3': '#CBA6F7', // Purple
  '4': '#F38BA8', // Red
  '5': '#F9E2AF', // Yellow
  '6': '#FAB387', // Orange/Peach
  '7': '#94E2D5', // Teal
  '8': '#A6ADC8', // Slate/Gray
  '9': '#74C7EC', // Sapphire (secondary blue)
  '10': '#8BD5A0', // Emerald (deep green)
  '11': '#E78284', // Darker red
};

// Light mode colors (pastel versions of the same colors)
export const LIGHT_COLOR_MAP: Record<string, string> = {
  '1': '#DEE9FF', // Blue
  '2': '#E6F6E9', // Green
  '3': '#F0E7FF', // Purple
  '4': '#FFE1E7', // Red (soft)
  '5': '#FFF2C9', // Yellow (readable)
  '6': '#FFE6D4', // Orange/Peach
  '7': '#DDF7F2', // Teal
  '8': '#EEF1F8', // Slate/Gray (clearer than #F5F5F5)
  '9': '#D9F2FF', // Sapphire
  '10': '#E1F7E8', // Emerald
  '11': '#FFDAD6', // Dark Red (distinct from 4)
};

export const EventEditor: React.FC<Props> = ({ open, onClose, initialStart, initialEnd, initialTitle = '', initialColorId, onSave }) => {
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState<Date>(new Date(initialStart));
  const [startTime, setStartTime] = useState(() => toTimeStr(initialStart));
  const [endTime, setEndTime] = useState(() => toTimeStr(initialEnd));
  const [colorId, setColorId] = useState<string | undefined>(initialColorId);
  const [saving, setSaving] = useState(false);
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [recurrenceCustomMode, setRecurrenceCustomMode] = useState(false);
  const { notesTheme } = useThemeSettings();

  const COLOR_MAP = notesTheme === 'light' ? LIGHT_COLOR_MAP : DARK_COLOR_MAP;

  // Keep date synced if props change (when opening editor for a different event)
  React.useEffect(() => {
    if (!open) return;
    setTitle(initialTitle || '');
    setDate(new Date(initialStart));
    setStartTime(toTimeStr(initialStart));
    setEndTime(toTimeStr(initialEnd));
    setColorId(initialColorId);
    setRecurrence(null);
    setRecurrenceCustomMode(false);
  }, [open, initialStart, initialEnd, initialTitle, initialColorId]);

  const onSubmit = async () => {
    const s = combine(date, startTime);
    const e = combine(date, endTime);
    if (e <= s) {
      alert('End time must be after start time.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ title: title.trim() || 'Untitled', start: s, end: e, colorId, recurrence });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o ? onClose() : undefined}>
      <DialogContent className={`sm:max-w-[520px] backdrop-blur-2xl 
        ${notesTheme === 'light'
          ? 'bg-gray-800/10 border-none text-black'
          : 'bg-main/95 text-white'
        }`}>
        <DialogHeader>
          <DialogTitle className="text-white">
            Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-gray-300">
              Title
            </Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              className={`bg-main text-white ${notesTheme === 'light' ? 'bg-white text-black' : ''}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`justify-start bg-main text-white ${notesTheme === 'light' ? 'bg-white text-black/75' : ''} `}
                  >
                    {date.toLocaleDateString()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 bg-secondary border-gray-700">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className={`
                      text-white 
                      [&_.rdp-button]:text-white [&_.rdp-button]:hover:bg-gray-700 
                      [&_.rdp-button]:hover:text-white [&_.rdp-caption]:text-white 
                      [&_.rdp-weekday]:text-gray-300 [&_.rdp-day]:text-white 
                      [&_.rdp-day_button]:text-white [&_.rdp-day_button]:hover:bg-gray-700 
                      [&_.rdp-day_button]:hover:text-white 
                      [&_.rdp-day_button[data-selected=true]]:bg-blue-600 
                      [&_.rdp-day_button[data-selected=true]]:text-white
                    `}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TimePicker
                value={startTime}
                onChange={setStartTime}
                label="Start"
              />
              <TimePicker
                value={endTime}
                onChange={setEndTime}
                label="End"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Color</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLOR_MAP).map(([id, hex]) => (
                <button
                  key={id}
                  onClick={() => setColorId(id)}
                  className={`h-7 w-7 rounded-full border ${colorId === id ? 'ring-2 ring-offset-2 ring-offset-secondary ring-white' : 'border-gray-600'}`}
                  style={{ backgroundColor: hex }}
                  title={`Color ${id}`}
                />
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <Label className="text-gray-300">Repeat</Label>
            <select
              className={`w-full ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'} rounded px-3 py-2 text-sm`}
              value={recurrenceCustomMode ? '__custom__' : (recurrence || '')}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__custom__') {
                  setRecurrenceCustomMode(true);
                  setRecurrence('');
                } else {
                  setRecurrenceCustomMode(false);
                  setRecurrence(v || null);
                }
              }}
            >
              <option value="">
                Does not repeat
              </option>
              <option value="RRULE:FREQ=DAILY">Daily</option>
              {(() => {
                const weekday = initialStart.toLocaleDateString(undefined, { weekday: 'long' });
                return <option value={rruleWeekly(initialStart)}>Weekly on {weekday.toLowerCase()}</option>;
              })()}
              {(() => {
                const day = initialStart.getDate();
                return <option value={`RRULE:FREQ=MONTHLY;BYMONTHDAY=${day}`}>Monthly on day {day}</option>;
              })()}
              {(() => {
                const md = `${String(initialStart.getMonth() + 1).padStart(2, '0')}${String(initialStart.getDate()).padStart(2, '0')}`;
                return <option value={`RRULE:FREQ=YEARLY;BYMONTHDAY=${initialStart.getDate()};BYMONTH=${initialStart.getMonth() + 1}`}>Annually on {initialStart.getDate()}/{initialStart.getMonth() + 1}</option>;
              })()}
              <option value="RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Every weekday (Mon–Fri)</option>
              <option value="__custom__">Custom…</option>
            </select>
            {recurrenceCustomMode && (
              <div className="space-y-1">
                <Label className="text-gray-400 text-xs">Enter RRULE (e.g., RRULE:FREQ=WEEKLY;BYDAY=TU)</Label>
                <Input
                  placeholder="RRULE:..."
                  className="bg-main border-gray-700 text-white"
                  value={recurrence ?? ''}
                  onChange={(e) => setRecurrence(e.target.value || null)}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving} className={`${notesTheme === 'light' ? 'text-white' : ''}`}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            className={`${notesTheme === 'light' ? 'light-bg-calendar-button text-black/75' : 'bg-calendar-button text-white'} `}
            disabled={saving}>{saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function toTimeStr(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function combine(date: Date, hhmm: string) {
  const [hh, mm] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

export const getEventColors = (theme: 'light' | 'dark') => {
  return theme === 'light' ? LIGHT_COLOR_MAP : DARK_COLOR_MAP;
};

export const EVENT_COLORS = DARK_COLOR_MAP; // Fallback

// Helpers for recurrence UI
function rruleWeekly(d: Date) {
  const map = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return `RRULE:FREQ=WEEKLY;BYDAY=${map[d.getDay()]}`;
}

