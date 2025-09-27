"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

// ===== Helper Functions =====
export function rruleWeekly(d: Date) {
  const map = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return `RRULE:FREQ=WEEKLY;BYDAY=${map[d.getDay()]}`;
}

export function summarizeRRule(rrule: string, baseDate: Date): string {
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

// ===== Types =====
export type CustomRecurrenceEditorProps = {
  initialStart: Date;
  notesTheme: 'light' | 'dark';
  onCancel: () => void;
  onDone: (rrule: string | null) => void;
  initialRRule?: string;
};

// ===== Component =====
export function CustomRecurrenceEditor(props: CustomRecurrenceEditorProps) {
  const { initialStart, notesTheme, onCancel, onDone, initialRRule } = props;
  const weekdayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  const [freq, setFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [interval, setInterval] = useState<number>(1);
  const [days, setDays] = useState<string[]>([weekdayMap[initialStart.getDay()]]);
  const [endMode, setEndMode] = useState<'never' | 'until' | 'count'>('never');
  const [untilDate, setUntilDate] = useState<string>('');
  const [count, setCount] = useState<number>(10);

  useEffect(() => {
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

  const dayChips = ['Su','Mo','Tu','We','Th','Fr','Sa'].map((short, idx) => {
    const d = ['SU','MO','TU','WE','TH','FR','SA'][idx];
    return (
      <button
        key={d}
        type="button"
        onClick={() => toggleDay(d)}
        className={cn(
          "px-3 py-2 rounded-full text-xs border-none",
          days.includes(d) ? 'bg-blue-900/40 text-white' : (notesTheme === 'light' ? 'bg-white text-black border-gray-300' : 'bg-main text-white border-gray-600')
        )}
        title={["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][idx]}
      >
        {short}
      </button>
    );
  });

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
          className={cn(
            "border-gray-600 [&_[data-focus-within]]:ring-0 [&_[data-focus-within]]:outline-none",
            notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'
          )}
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
          <Label className={notesTheme === 'light' ? 'text-black/80' : 'text-gray-300'}>
            Repeat on
          </Label>
          <div className="flex flex-wrap gap-2">
            {dayChips}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        <Label className={notesTheme === 'light' ? 'text-black/80' : 'text-gray-300'}>
          Ends
        </Label>
        <RadioGroup value={endMode} onValueChange={(value) => setEndMode(value as 'never' | 'until' | 'count')} className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="never" id="never" />
            <Label htmlFor="never">Never</Label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="until" id="until" />
            <Label htmlFor="until">On date</Label>
            <Input
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              className={cn(
                "ml-2 w-auto border-gray-600",
                notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'
              )}
              disabled={endMode !== 'until'}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="count" id="count" />
            <Label htmlFor="count">
              After
            </Label>
            <Input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className={cn(
                "ml-2 w-20 border-gray-600",
                notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'
              )}
            />
            <span>occurrence(s)</span>
          </div>
        </RadioGroup>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onCancel} className={cn(
          notesTheme === 'light' ? 'text-black/75' : ''
        )}>Cancel</Button>
        <Button type="button" onClick={() => onDone(buildRule())} className={cn(
          notesTheme === 'light' ? 'light-bg-calendar-button text-black/75' : 'bg-calendar-button text-white'
        )}>Done</Button>
      </div>
    </div>
  );
}
