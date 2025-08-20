'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

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
const COLOR_MAP: Record<string, string> = {
  '1': '#a4bdfc',
  '2': '#7AE7BF',
  '3': '#DBADFF',
  '4': '#FF887C',
  '5': '#FBD75B',
  '6': '#FFB878',
  '7': '#46D6DB',
  '8': '#E1E1E1',
  '9': '#5484ED',
  '10': '#51B749',
  '11': '#DC2127',
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
    <DialogContent className="sm:max-w-[520px] bg-secondary text-white border-gray-700">
        <DialogHeader>
  <DialogTitle className="text-white">Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-gray-300">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="bg-main border-gray-700 text-white" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-300">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start bg-main border-gray-700 text-white">
                    {date.toLocaleDateString()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 bg-secondary border-gray-700">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Start</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-main border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">End</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-main border-gray-700 text-white" />
              </div>
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
              className="w-full bg-main border border-gray-700 rounded px-3 py-2 text-sm text-white"
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
              <option value="">Does not repeat</option>
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
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
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

export const EVENT_COLORS = COLOR_MAP;

// Helpers for recurrence UI
function rruleWeekly(d: Date) {
  const map = ['SU','MO','TU','WE','TH','FR','SA'];
  return `RRULE:FREQ=WEEKLY;BYDAY=${map[d.getDay()]}`;
}

