'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { TimePicker } from './TimePicker';
import { useThemeSettings } from '../../hooks';

type Props = {
  open: boolean;
  onClose: () => void;
  initialStart: Date;
  initialEnd: Date;
  initialTitle?: string;
  initialColorId?: string;
  initialRecurrence?: string | null;
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

export const EventEditor: React.FC<Props> = ({ open, onClose, initialStart, initialEnd, initialTitle = '', initialColorId, initialRecurrence = null, onSave }) => {
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
    setRecurrence(initialRecurrence || null);
    setRecurrenceCustomMode(false);
  }, [open, initialStart, initialEnd, initialTitle, initialColorId, initialRecurrence]);

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
      <DialogContent className={`sm:max-w-[520px] backdrop-blur-2xl border-gray-700 border rounded-3xl 
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
                    className={`justify-start bg-main text-white hover:text-gray-300 ${notesTheme === 'light' ? 'bg-white text-black/75' : ''} `}
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
            {(() => {
              const weekly = rruleWeekly(initialStart);
              const monthly = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${initialStart.getDate()}`;
              const yearly = `RRULE:FREQ=YEARLY;BYMONTHDAY=${initialStart.getDate()};BYMONTH=${initialStart.getMonth() + 1}`;
              const weekday = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
              const presets = new Set<string>(['RRULE:FREQ=DAILY', weekly, monthly, yearly, weekday]);
              const isCustom = !!recurrence && !presets.has(recurrence);
              const selectValue = recurrenceCustomMode ? '__custom__' : (!recurrence ? '' : (isCustom ? '__custom__' : recurrence));
              const customLabel = isCustom ? `Custom — ${summarizeRRule(recurrence!, initialStart)}` : 'Custom…';
              return (
                <select
                  className={`w-full ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'} rounded px-3 py-2 text-sm`}
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '__custom__') {
                      setRecurrenceCustomMode(true);
                      // do not wipe existing custom rule
                    } else {
                      setRecurrenceCustomMode(false);
                      setRecurrence(v || null);
                    }
                  }}
                >
                  <option value="">Does not repeat</option>
                  <option value="RRULE:FREQ=DAILY">Daily</option>
                  <option value={weekly}>{`Weekly on ${initialStart.toLocaleDateString('en-US', { weekday: 'long' })}`}</option>
                  <option value={monthly}>{`Monthly on day ${initialStart.getDate()}`}</option>
                  <option value={yearly}>{`Annually on ${initialStart.getDate()}/${initialStart.getMonth() + 1}`}</option>
                  <option value={weekday}>Every weekday (Mon–Fri)</option>
                  <option value="__custom__">{customLabel}</option>
                </select>
              );
            })()}
            {recurrenceCustomMode && (
              <CustomRecurrenceEditor
                initialStart={combine(date, startTime)}
                notesTheme={notesTheme}
                onCancel={() => setRecurrenceCustomMode(false)}
                initialRRule={recurrence || undefined}
                onDone={(rule) => {
                  setRecurrence(rule || null);
                  setRecurrenceCustomMode(false);
                }}
              />
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

function summarizeRRule(rrule: string, baseDate: Date): string {
  try {
    const raw = rrule.startsWith('RRULE:') ? rrule.substring(6) : rrule;
    const kv = new Map<string, string>();
    raw.split(';').forEach(p => {
      const [k, v] = p.split('=');
      kv.set((k || '').toUpperCase(), v || '');
    });
    const freq = kv.get('FREQ') || 'DAILY';
    const interval = parseInt(kv.get('INTERVAL') || '1', 10);
    const until = kv.get('UNTIL');
    const count = kv.get('COUNT');
    const endsPart = (() => {
      if (until) {
        const y = Number(until.slice(0, 4));
        const m = Number(until.slice(4, 6));
        const d = Number(until.slice(6, 8));
        const hh = Number(until.slice(9, 11) || '0');
        const mm = Number(until.slice(11, 13) || '0');
        const ss = Number(until.slice(13, 15) || '0');
        const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
        return ` until ${dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
      }
      if (count) {
        const c = parseInt(count, 10);
        return ` for ${c} occurrence${c > 1 ? 's' : ''}`;
      }
      return '';
    })();
    const every = interval > 1 ? `every ${interval}` : 'every';
    if (freq === 'DAILY') {
      return `${every} day${interval > 1 ? 's' : ''}${endsPart}`;
    }
    if (freq === 'WEEKLY') {
      const mapNames: Record<string, string> = { SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday' };
      const by = (kv.get('BYDAY') || '').split(',').filter(Boolean).map(d => mapNames[d] || d).join(', ');
      return `${every} week${interval > 1 ? 's' : ''}${by ? ` on ${by}` : ''}${endsPart}`;
    }
    if (freq === 'MONTHLY') {
      return `${every} month${interval > 1 ? 's' : ''} on day ${baseDate.getDate()}${endsPart}`;
    }
    if (freq === 'YEARLY') {
      return `${every} year${interval > 1 ? 's' : ''} on ${baseDate.getDate()}/${baseDate.getMonth() + 1}${endsPart}`;
    }
    return 'Custom…';
  } catch {
    return 'Custom…';
  }
}

export function summarizeRRuleLong(rrule: string, baseDate: Date): string {
  // English phrasing similar to Google Calendar card
  const raw = summarizeRRule(rrule, baseDate);
  // Ensure first letter uppercase and tweak joiners
  const s = raw.charAt(0).toUpperCase() + raw.slice(1);
  return s;
}

type CustomRecurrenceEditorProps = {
  initialStart: Date;
  notesTheme: 'light' | 'dark';
  onCancel: () => void;
  onDone: (rrule: string | null) => void;
};

function CustomRecurrenceEditor(props: CustomRecurrenceEditorProps & { initialRRule?: string }) {
  const { initialStart, notesTheme, onCancel, onDone, initialRRule } = props;
  const weekdayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const [freq, setFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [interval, setInterval] = useState<number>(1);
  const [days, setDays] = useState<string[]>([weekdayMap[initialStart.getDay()]]);
  const [endMode, setEndMode] = useState<'never' | 'until' | 'count'>('never');
  const [untilDate, setUntilDate] = useState<string>(''); // yyyy-mm-dd
  const [count, setCount] = useState<number>(10);

  // Parse existing RRULE if provided, to prefill the UI
  React.useEffect(() => {
    if (!initialRRule) return;
    const raw = initialRRule.startsWith('RRULE:') ? initialRRule.substring(6) : initialRRule;
    const map = new Map<string, string>();
    raw.split(';').forEach(p => {
      const [k, v] = p.split('=');
      if (k && v) map.set(k.toUpperCase(), v);
    });
    const f = (map.get('FREQ') as any) || 'WEEKLY';
    setFreq(f);
    const iv = parseInt(map.get('INTERVAL') || '1', 10);
    if (!Number.isNaN(iv)) setInterval(Math.max(1, iv));
    if (f === 'WEEKLY') {
      const byday = (map.get('BYDAY') || '').split(',').filter(Boolean);
      if (byday.length > 0) setDays(byday);
    }
    if (f === 'MONTHLY') {
      // BYMONTHDAY is assumed automatically; nothing to set
    }
    if (f === 'YEARLY') {
      // BYMONTH and BYMONTHDAY assumed; nothing to set
    }
    if (map.has('UNTIL')) {
      const until = map.get('UNTIL')!; // YYYYMMDDTHHMMSSZ
      const y = until.slice(0, 4);
      const m = until.slice(4, 6);
      const d = until.slice(6, 8);
      setEndMode('until');
      setUntilDate(`${y}-${m}-${d}`);
    } else if (map.has('COUNT')) {
      setEndMode('count');
      const c = parseInt(map.get('COUNT') || '10', 10);
      if (!Number.isNaN(c)) setCount(Math.max(1, c));
    } else {
      setEndMode('never');
    }
  }, [initialRRule]);

  function toggleDay(d: string) {
    setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  }

  function toUntilUTC(yyyyMmDd: string): string | null {
    if (!yyyyMmDd) return null;
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    if (!y || !m || !d) return null;
    // Use 23:59:59 on that local date, convert to UTC
    const dt = new Date(y, (m - 1), d, 23, 59, 59, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
  }

  function buildRule(): string {
    const parts: string[] = [`FREQ=${freq}`, `INTERVAL=${Math.max(1, Number(interval) || 1)}`];
    if (freq === 'WEEKLY') {
      const selected = days.length > 0 ? days.slice().sort() : [weekdayMap[initialStart.getDay()]];
      parts.push(`BYDAY=${selected.join(',')}`);
    }
    if (freq === 'MONTHLY') {
      parts.push(`BYMONTHDAY=${initialStart.getDate()}`);
    }
    if (freq === 'YEARLY') {
      parts.push(`BYMONTH=${initialStart.getMonth() + 1}`);
      parts.push(`BYMONTHDAY=${initialStart.getDate()}`);
    }
    if (endMode === 'until') {
      const u = toUntilUTC(untilDate);
      if (u) parts.push(`UNTIL=${u}`);
    } else if (endMode === 'count') {
      parts.push(`COUNT=${Math.max(1, Number(count) || 1)}`);
    }
    const rule = `RRULE:${parts.join(';')}`;
    return rule;
  }



  const dayChips = weekdayMap.map((d, idx) => (
    <button
      key={d}
      type="button"
      onClick={() => toggleDay(d)}
      className={`px-2 py-1 rounded-full text-xs border ${days.includes(d) ? (notesTheme === 'light' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-600') : (notesTheme === 'light' ? 'bg-white text-black border-gray-300' : 'bg-main text-white border-gray-600')}`}
      title={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx]}
    >
      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][idx]}
    </button>
  ));

  return (
    <div className={`rounded-md p-3 border ${notesTheme === 'light' ? 'bg-white text-black border-gray-200' : 'bg-secondary border-gray-700'}`}>
      <div className="grid grid-cols-3 gap-2 items-center">
        <Label className={notesTheme === 'light' ? 'text-black/80' : 'text-gray-300'}>
          Repeat every
        </Label>
        <Input
          type="number"
          min={1}
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          className={`${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'}`}
        />
        <select
          className={`rounded px-2 py-2 text-sm ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'}`}
          value={freq}
          onChange={(e) => setFreq(e.target.value as any)}
        >
          <option value="DAILY">day(s)</option>
          <option value="WEEKLY">week(s)</option>
          <option value="MONTHLY">month(s)</option>
          <option value="YEARLY">year(s)</option>
        </select>
      </div>

      {freq === 'WEEKLY' && (
        <div className="mt-3 space-y-2">
          <Label className={notesTheme === 'light' ? 'text-black/80' : 'text-gray-300'}>Repeat on</Label>
          <div className="flex flex-wrap gap-2">
            {dayChips}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        <Label className={notesTheme === 'light' ? 'text-black/80' : 'text-gray-300'}>Ends</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="rr-end" checked={endMode === 'never'} onChange={() => setEndMode('never')} />
            <span>Never</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="rr-end" checked={endMode === 'until'} onChange={() => setEndMode('until')} />
            <span>On date</span>
            <Input
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className={`ml-2 w-auto ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'}`}
              disabled={endMode !== 'until'}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="rr-end" checked={endMode === 'count'} onChange={() => setEndMode('count')} />
            <span>After</span>
            <Input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className={`ml-2 w-20 ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'}`}
              disabled={endMode !== 'count'}
            />
            <span>occurrence(s)</span>
          </label>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onCancel} className={`${notesTheme === 'light' ? 'text-black/75' : ''}`}>Cancel</Button>
        <Button type="button" onClick={() => onDone(buildRule())} className={`${notesTheme === 'light' ? 'light-bg-calendar-button text-black/75' : 'bg-calendar-button text-white'}`}>Done</Button>
      </div>
    </div>
  );
}

