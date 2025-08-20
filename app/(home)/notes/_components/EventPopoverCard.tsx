'use client';

import React from 'react';
import { Pencil, Trash2, X, Link2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type EventPopoverProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchor: React.ReactNode; // the trigger/anchor to click
  title: string;
  start: Date;
  end: Date;
  colorHex?: string;
  onEdit: () => void;
  onDelete: () => void;
};

export const EventPopoverCard: React.FC<EventPopoverProps> = ({ open, onOpenChange, anchor, title, start, end, colorHex = '#3b82f6', onEdit, onDelete }) => {
  const dateStr = formatDateRange(start, end);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {anchor}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-[320px] p-0 bg-secondary border-gray-700 text-white">
        <div className="p-3">
          {/* Actions row */}
          <div className="flex items-center justify-end gap-1">
            <button className="p-1 rounded hover:bg-gray-700" onClick={onEdit} title="Edit">
              <Pencil size={16} />
            </button>
            <button className="p-1 rounded hover:bg-gray-700" onClick={onDelete} title="Delete">
              <Trash2 size={16} />
            </button>
            <button className="p-1 rounded hover:bg-gray-700" onClick={() => onOpenChange(false)} title="Close">
              <X size={16} />
            </button>
          </div>

          {/* Title */}
          <div className="mt-1 flex items-start gap-2">
            <span className="mt-1 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colorHex }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base truncate">{title || 'Untitled'}</div>
              <div className="text-sm text-gray-300 mt-0.5">{dateStr}</div>
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

function formatDateRange(start: Date, end: Date) {
  try {
    const locale = undefined; // browser locale
    const day = start.toLocaleDateString(locale, { weekday: 'long' });
    const date = start.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    const time = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    return `${capitalize(day)}, ${date} • ${time}`;
  } catch {
    return `${start.toLocaleString()} – ${end.toLocaleString()}`;
  }
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
