'use client';

import React from 'react';
import { Pencil, Trash2, X, Link2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useThemeSettings } from '../../hooks';
import { getEvent } from '@/app/lib/googleCalendar';
import { summarizeRRuleLong } from './EventEditor';

export type EventPopoverProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchor: React.ReactNode; // the trigger/anchor to click
  title: string;
  start: Date;
  end: Date;
  colorHex?: string;
  recurrence?: string[] | undefined | null;
  recurringEventId?: string | undefined | null;
  onEdit: () => void;
  onDelete: () => void;
};

export const EventPopoverCard: React.FC<EventPopoverProps> = ({ open, onOpenChange, anchor, title, start, end, colorHex = '#3b82f6', onEdit, onDelete, recurrence, recurringEventId }) => {
  const { notesTheme } = useThemeSettings();
  const dateStr = formatDateRange(start, end, 'en-US');
  const [rrule, setRRule] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Prefer provided recurrence; otherwise fetch from master if this is an instance
    const fromProp = (recurrence || []).find(r => r && r.toUpperCase().startsWith('RRULE')) || null;
    if (fromProp) {
      setRRule(fromProp);
      return;
    }
    if (recurringEventId) {
      getEvent(recurringEventId).then(master => {
        const r = (master.recurrence || []).find(x => x && x.toUpperCase().startsWith('RRULE')) || null;
        if (r) setRRule(r);
      }).catch(() => {});
    }
  }, [recurrence, recurringEventId]);

  const recurrenceStr = rrule ? summarizeRRuleLong(rrule, start) : '';
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {anchor}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className={`w-[320px] p-0 bg-main/95 backdrop-blur-2xl border-none`}
      >
        <div className="p-3">
          {/* Actions row */}
          <div className="flex items-center justify-end gap-1">
            <button
              className={`p-1 rounded hover:bg-gray-700 ${notesTheme === 'light' ? 'text-black hover:bg-gray-900/20' : 'text-white'}`}
              onClick={onEdit}
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            <button
              className={`p-1 rounded hover:bg-gray-700 ${notesTheme === 'light' ? 'text-black hover:bg-gray-900/20' : 'text-white'}`}
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button
              className={`p-1 rounded hover:bg-gray-700 ${notesTheme === 'light' ? 'text-black hover:bg-gray-900/20' : 'text-white'}`}
              onClick={() => onOpenChange(false)}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Title */}
          <div className="mt-1 flex items-start gap-2">
            <span
              className="mt-1 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colorHex }}
            />
            <div className="flex-1 min-w-0">
              <div 
                className={`font-semibold cursor-pointer text-base ${notesTheme === 'light' ? 'text-black' : 'text-white'}`}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.2'
                }}
                title={title || 'Untitled'}
              >
                {title || 'Untitled'}
              </div>
              <div className={`text-sm text-gray-300 mt-0.5 ${notesTheme === 'light' ? 'text-gray-900' : ''}`}>
                {dateStr}
              </div>
              {rrule && (
                <div className={`text-sm mt-0.5 ${notesTheme === 'light' ? 'text-gray-900' : 'text-gray-300'}`}>
                  {recurrenceStr}
                </div>
              )}
            </div>
          </div>

          {/* Placeholder share button (optional) */}
          {/* <button className="mt-3 w-full justify-center gap-2 bg-main border border-gray-700 text-white rounded px-3 py-2 flex items-center">
            <Link2 size={16} /> Mời qua đường liên kết
          </button> */}
        </div>
      </PopoverContent>
    </Popover>
  );
};

function formatDateRange(start: Date, end: Date, locale: string | undefined) {
  try {
    const day = start.toLocaleDateString(locale, { weekday: 'long' });
    const date = start.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    const time = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    return `${capitalize(day)}, ${date} • ${time}`;
  } catch {
    return `${start.toLocaleString()} – ${end.toLocaleString()}`;
  }
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
