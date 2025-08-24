'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { listEvents, createEvent, updateEvent, deleteEvent, CalendarEvent } from '@/app/lib/googleCalendar';
import { EventEditor, EVENT_COLORS, getEventColors } from './EventEditor';
import { EventPopoverCard } from './EventPopoverCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteRecurringScope } from '@/app/lib/googleCalendar';
import { useThemeSettings } from '../_hooks';

type ViewMode = 'week' | 'month';

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0..6, Sunday=0
  const diff = (day + 6) % 7; // Monday as first day
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHour(h: number): string { return `${h.toString().padStart(2, '0')}:00`; }

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function sameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface CalendarPanelProps {
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  currentDate?: Date;
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({
  onPrev,
  onNext,
  onToday,
  currentDate
}) => {
  const { notesTheme } = useThemeSettings();
  const EVENT_COLORS = getEventColors(notesTheme);
  const [current, setCurrent] = useState<Date>(currentDate || new Date());

  // Sync with parent's currentDate prop
  useEffect(() => {
    if (currentDate) {
      setCurrent(currentDate);
    }
  }, [currentDate]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ViewMode>('week');
  const gridRef = useRef<HTMLDivElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorData, setEditorData] = useState<{ id?: string; start: Date; end: Date; title?: string; colorId?: string; recurrence?: string | null } | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [openPopoverFor, setOpenPopoverFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [deleteMode, setDeleteMode] = useState<'instance' | 'following' | 'all'>('instance');
  const [deleting, setDeleting] = useState(false);
  const suppressCreateRef = useRef(false);
  const setSuppressCreate = useCallback((v: boolean) => { suppressCreateRef.current = v; }, []);
  const suppressCreate = useCallback(() => {
    // legacy quick suppression (kept for other clicky places)
    setSuppressCreate(true);
    window.setTimeout(() => { setSuppressCreate(false); }, 250);
  }, [setSuppressCreate]);
  // Suppress opening popover when a drag occurred
  const suppressPopoverClickRef = useRef(false);
  // Track dragging and last drag end time to block stray clicks on day column
  const draggingRef = useRef(false);
  const lastDragAtRef = useRef(0);

  // Calendar geometry: adjust here to change the visual spacing between hours
  // Smaller HOUR_HEIGHT => more compact hour rows
  const HOUR_HEIGHT = 60; // px per hour (was 120)
  const PX_PER_MIN = HOUR_HEIGHT / 60; // derived pixels per minute

  // Get timezone display name
  const getTimezoneDisplay = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const minutes = Math.abs(offset % 60);
    const sign = offset <= 0 ? '+' : '-';

    if (minutes === 0) {
      return `GMT ${sign}${hours}`;
    } else {
      return `GMT ${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
    }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const weekStart = useMemo(() => startOfWeek(current), [current]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const visibleRange = useMemo(() => {
    if (view === 'week') {
      const start = new Date(weekStart);
      const end = addDays(weekStart, 7);
      return { start, end };
    }
    // Simple month range: first to last day with padding
    const first = new Date(current.getFullYear(), current.getMonth(), 1);
    const last = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const end = addDays(startOfWeek(addDays(last, 1)), 7);
    return { start, end };
  }, [view, current, weekStart]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listEvents(visibleRange.start, visibleRange.end);
      setEvents(data);
    } catch (e) {
      // silent fail in UI; you can add a toast later
    } finally {
      setLoading(false);
    }
  }, [visibleRange]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreateQuick = useCallback(async (day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    setEditorData({ start, end, title: 'New event', recurrence: null });
    setEditorOpen(true);
  }, []);

  // Optimistic drag/resize: update UI on mousemove, call API once on mouseup
  const applyOptimistic = useCallback((id: string, nextStart: Date, nextEnd: Date) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, start: nextStart.toISOString(), end: nextEnd.toISOString() } : e));
  }, []);

  const handleDelete = useCallback(async (ev: CalendarEvent) => {
    // If recurring, open dialog to select scope
    if (ev.recurringEventId || (ev.recurrence && ev.recurrence.length > 0)) {
      setDeleteTarget(ev);
      setDeleteMode('instance');
      return;
    }
    await deleteEvent(ev.id);
    setEvents(prev => prev.filter(e => e.id !== ev.id));
  }, []);

  const confirmDelete = useCallback(async () => {
    const ev = deleteTarget;
    if (!ev) return;
    setDeleting(true);
    try {
      if (ev.recurringEventId || (ev.recurrence && ev.recurrence.length > 0)) {
        await deleteRecurringScope({
          eventId: ev.id,
          mode: deleteMode,
          recurringEventId: ev.recurringEventId || null,
          originalStartTime: ev.originalStartTime || null,
        });
        // After scope change, refetch since instances may shift
        await fetchEvents();
      } else {
        await deleteEvent(ev.id);
        setEvents(prev => prev.filter(e => e.id !== ev.id));
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleteMode, fetchEvents]);

  // Basic DnD/resize interactions implemented via mouse events
  const dragState = useRef<{
    id: string;
    type: 'pending-move' | 'move' | 'resize-start' | 'resize-end';
    startY: number;
    originalStart: Date;
    originalEnd: Date;
    lastDeltaMin: number;
  } | null>(null);
  const onMouseDownMovePotential = (e: React.MouseEvent, id: string) => {
    // If starting on a resize handle, don't begin a move
    if (e.target instanceof HTMLElement && e.target.closest('[data-role="resize-handle"]')) {
      return;
    }
    const ev = events.find(x => x.id === id);
    if (!ev) return;
    dragState.current = {
      id,
      type: 'pending-move',
      startY: e.clientY,
      originalStart: new Date(ev.start),
      originalEnd: new Date(ev.end),
      lastDeltaMin: 0,
    };
    // Do not prevent default to allow click if no movement; do stop propagation to avoid day click
    setSuppressCreate(true);
    e.stopPropagation();
  };

  const getMaxLines = (height: number) => {
    // Subtract padding (p-2 = 8px top + 8px bottom = 16px)
    // Subtract time (about 12px for text-[10px])
    // Subtract gap between title and time (about 4px)
    const availableHeight = height - 16 - 12 - 4;
    // Each line of text-sm is about 16px
    const lineHeight = 16;
    const maxLines = Math.floor(availableHeight / lineHeight);
    return Math.max(1, maxLines); // Minimum 1 line, maximum 5 lines
  };

  const onMouseDownMoveHandle = (e: React.MouseEvent, id: string) => {
    const ev = events.find(x => x.id === id);
    if (!ev) return;
    dragState.current = {
      id,
      type: 'move',
      startY: e.clientY,
      originalStart: new Date(ev.start),
      originalEnd: new Date(ev.end),
      lastDeltaMin: 0,
    };
    e.preventDefault();
    e.stopPropagation();
  };
  const onMouseDownResizeEnd = (e: React.MouseEvent, id: string) => {
    const ev = events.find(x => x.id === id);
    if (!ev) return;
    dragState.current = {
      id,
      type: 'resize-end',
      startY: e.clientY,
      originalStart: new Date(ev.start),
      originalEnd: new Date(ev.end),
      lastDeltaMin: 0,
    };
    suppressPopoverClickRef.current = true;
    setSuppressCreate(true);
    e.preventDefault();
    e.stopPropagation();
  };
  const onMouseDownResizeStart = (e: React.MouseEvent, id: string) => {
    const ev = events.find(x => x.id === id);
    if (!ev) return;
    dragState.current = {
      id,
      type: 'resize-start',
      startY: e.clientY,
      originalStart: new Date(ev.start),
      originalEnd: new Date(ev.end),
      lastDeltaMin: 0,
    };
    suppressPopoverClickRef.current = true;
    setSuppressCreate(true);
    draggingRef.current = true;
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const st = dragState.current;
      if (!st) return;
      const deltaY = e.clientY - st.startY;
      const minutes = Math.round(deltaY / PX_PER_MIN); // derive minutes from pixels
      st.lastDeltaMin = minutes;
      const MINUTES_DRAG_THRESHOLD = 2; // avoid treating tiny moves as drag
      if (st.type === 'pending-move') {
        if (Math.abs(minutes) >= MINUTES_DRAG_THRESHOLD) {
          // upgrade to active move
          st.type = 'move';
          suppressPopoverClickRef.current = true;
          draggingRef.current = true;
          const nextStart = new Date(st.originalStart.getTime() + minutes * 60000);
          const nextEnd = new Date(st.originalEnd.getTime() + minutes * 60000);
          applyOptimistic(st.id, nextStart, nextEnd);
        }
      } else if (st.type === 'move') {
        const nextStart = new Date(st.originalStart.getTime() + minutes * 60000);
        const nextEnd = new Date(st.originalEnd.getTime() + minutes * 60000);
        applyOptimistic(st.id, nextStart, nextEnd);
      } else if (st.type === 'resize-end') {
        // resize end: adjust end, min 15 minutes
        const minMinutes = 15;
        const rawEnd = new Date(st.originalEnd.getTime() + minutes * 60000);
        const duration = (rawEnd.getTime() - st.originalStart.getTime()) / 60000;
        const safeEnd = duration < minMinutes
          ? new Date(st.originalStart.getTime() + minMinutes * 60000)
          : rawEnd;
        applyOptimistic(st.id, new Date(st.originalStart), safeEnd);
      } else if (st.type === 'resize-start') {
        // resize start: adjust start, min 15 minutes
        const minMinutes = 15;
        const rawStart = new Date(st.originalStart.getTime() + minutes * 60000);
        const duration = (st.originalEnd.getTime() - rawStart.getTime()) / 60000;
        const safeStart = duration < minMinutes
          ? new Date(st.originalEnd.getTime() - minMinutes * 60000)
          : rawStart;
        applyOptimistic(st.id, safeStart, new Date(st.originalEnd));
      }
    };
    const handleUp = async () => {
      const st = dragState.current;
      dragState.current = null;
      if (!st) return;
      try {
        if (st.type === 'pending-move') {
          // treat as click; do nothing
        } else if (st.type === 'move') {
          const start = new Date(st.originalStart.getTime() + st.lastDeltaMin * 60000);
          const end = new Date(st.originalEnd.getTime() + st.lastDeltaMin * 60000);
          if (st.lastDeltaMin !== 0) {
            const updated = await updateEvent(st.id, { start, end });
            setEvents(prev => prev.map(e => e.id === st.id ? updated : e));
          }
          // allow click events again after a tick
          lastDragAtRef.current = Date.now();
          draggingRef.current = false;
          setTimeout(() => { suppressPopoverClickRef.current = false; setSuppressCreate(false); }, 300);
        } else if (st.type === 'resize-end') {
          const minMinutes = 15;
          const rawEnd = new Date(st.originalEnd.getTime() + st.lastDeltaMin * 60000);
          const duration = (rawEnd.getTime() - st.originalStart.getTime()) / 60000;
          const end = duration < minMinutes
            ? new Date(st.originalStart.getTime() + minMinutes * 60000)
            : rawEnd;
          const updated = await updateEvent(st.id, { end });
          setEvents(prev => prev.map(e => e.id === st.id ? updated : e));
          lastDragAtRef.current = Date.now();
          draggingRef.current = false;
          setTimeout(() => { suppressPopoverClickRef.current = false; setSuppressCreate(false); }, 300);
        } else if (st.type === 'resize-start') {
          const minMinutes = 15;
          const rawStart = new Date(st.originalStart.getTime() + st.lastDeltaMin * 60000);
          const duration = (st.originalEnd.getTime() - rawStart.getTime()) / 60000;
          const start = duration < minMinutes
            ? new Date(st.originalEnd.getTime() - minMinutes * 60000)
            : rawStart;
          const updated = await updateEvent(st.id, { start });
          setEvents(prev => prev.map(e => e.id === st.id ? updated : e));
          lastDragAtRef.current = Date.now();
          draggingRef.current = false;
          setTimeout(() => { suppressPopoverClickRef.current = false; setSuppressCreate(false); }, 300);
        }
      } catch { }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [applyOptimistic, PX_PER_MIN]);

  const renderWeekGrid = () => {

    const onCreateAtOffset = (day: Date, offsetY: number) => {
      const minutes = Math.max(0, Math.min(24 * 60 - 60, Math.floor(offsetY / PX_PER_MIN))); // clamp, 1h length
      const hour = Math.floor(minutes / 60);
      handleCreateQuick(day, hour);
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/60">
          <div className="flex items-center gap-2">
            <button onClick={fetchEvents} className={`px-2 py-1 bg-calendar-button rounded flex items-center gap-1 ${notesTheme === 'light' ? 'light-bg-calendar-button' : ''} `}>
              <RefreshCw size={14} />
              Refresh
            </button>
            <select
              value={view}
              onChange={e => setView(e.target.value as ViewMode)}
              className={`bg-calendar-button border rounded px-2 py-1 text-sm border-[rgba(255,255,255,0.12)] ${notesTheme === 'light' ? 'light-bg-calendar-button' : ''}`}
            >
              <option value="week">Week</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <span title="Syncing events" aria-label="Syncing events">
                <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[60px_repeat(7,1fr)] flex-1 overflow-auto" ref={gridRef}>
          {/* Header row */}
          <div className="sticky left-0 top-0 z-10 bg-main border-r border-gray-700/60 flex items-center justify-center py-2">
            <div className="text-xs text-gray-400 font-medium">
              {getTimezoneDisplay()}
            </div>
          </div>
          {weekDays.map((d, idx) => (
            <div key={idx} className="text-center py-2 border-r border-gray-700/60 sticky top-0 bg-main z-10">
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs uppercase tracking-wide text-gray-400">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div className={`h-7 w-7 flex items-center justify-center rounded-full text-sm ${sameDate(d, now) ? 'bg-blue-600 text-white' : 'text-gray-200'}`}>{d.getDate()}</div>
              </div>
            </div>
          ))}

          {/* Time column body */}
          <div className="border-r border-gray-700/60 bg-main" style={{ height: HOUR_HEIGHT * 24 }}>
            {/* Hour lines - aligned with calendar grid */}
            {HOURS.map(h => (
              <div key={h} className="absolute left-0 right-0 border-t border-gray-700/60" style={{ top: h * HOUR_HEIGHT }} />
            ))}
            {/* Hour labels - positioned to overlay the lines */}
            {HOURS.map(h => (
              <div key={h} className="absolute left-1 text-xs text-gray-400 bg-main px-1" style={{ top: h === 0 ? 4 : h * HOUR_HEIGHT - 8 }}>
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((d, idx) => (
            <div key={idx} className="relative border-r border-gray-700/60" style={{ height: HOUR_HEIGHT * 24 }}
              onClick={(e) => {
                if (suppressCreateRef.current) return;
                // If a drag just ended, swallow this click to avoid creating a new event
                if (Date.now() - lastDragAtRef.current < 300) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                onCreateAtOffset(d, e.clientY - rect.top);
              }}>
              {/* hour lines */}
              {HOURS.map(h => (
                <div key={h} className="absolute left-0 right-0 border-t border-gray-700/40" style={{ top: h * HOUR_HEIGHT }} />
              ))}

              {/* current time line */}
              {sameDate(d, now) && (
                <div className="absolute left-0 right-0 z-10" style={{ top: (now.getHours() * 60 + now.getMinutes()) * PX_PER_MIN }}>
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 border-t border-red-500" />
                  </div>
                </div>
              )}

              {/* events in this day */}
              {events.filter(ev => {
                const s = new Date(ev.start);
                return s.toDateString() === d.toDateString();
              }).map(ev => {
                const s = new Date(ev.start);
                const e = new Date(ev.end);
                const top = (s.getHours() * 60 + s.getMinutes()) * PX_PER_MIN;
                const height = Math.max(24, ((e.getTime() - s.getTime()) / 60000) * PX_PER_MIN);
                const maxLines = getMaxLines(height);
                return (
                  <div key={ev.id} className="absolute left-1 right-1"
                    style={{ top, height }}>
                    <EventPopoverCard
                      open={openPopoverFor === ev.id}
                      onOpenChange={(o) => { if (!o) suppressCreate(); setOpenPopoverFor(o ? ev.id : null); }}
                      anchor={
                        <div
                          className="mx-2 relative h-full overflow-hidden text-white rounded p-2 shadow-md border cursor-pointer group transition-all duration-200 backdrop-blur-md"
                          style={{
                            backgroundColor: ev.colorId ? `${EVENT_COLORS[ev.colorId] || '#3b82f6'}cc` : '#3b82f6cc',
                            borderColor: ev.colorId ? (EVENT_COLORS[ev.colorId] || '#60a5fa') : '#60a5fa',
                          }}
                          onClick={(e) => {
                            suppressCreate();
                            if (suppressPopoverClickRef.current) {
                              e.preventDefault();
                              e.stopPropagation();
                            } else {
                              e.stopPropagation();
                            }
                          }}
                          onMouseDown={(e) => {
                            suppressCreate();
                            onMouseDownMovePotential(e, ev.id);
                          }}
                        >
                          {/* Absolute top/bottom resize handles (thicker for easier hit, show resize cursor) */}
                          <div
                            className="absolute left-0 right-0 top-0 h-3 cursor-ns-resize"
                            onMouseDown={(e) => { onMouseDownResizeStart(e, ev.id); }}
                            title="Drag to adjust start time"
                            data-role="resize-handle"
                          />
                          <div
                            className="absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize"
                            onMouseDown={(e) => { onMouseDownResizeEnd(e, ev.id); }}
                            title="Drag to adjust end time"
                            data-role="resize-handle"
                          />

                          <div className="flex flex-col h-full justify-start">
                            <div className="font-medium text-sm leading-tight break-words"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: maxLines,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                              {ev.summary}
                            </div>
                            <div className="text-[11px] opacity-80 mt-1">
                              {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                        </div>
                      }
                      title={ev.summary}
                      start={new Date(ev.start)}
                      end={new Date(ev.end)}
                      colorHex={ev.colorId ? (EVENT_COLORS[ev.colorId] || '#3b82f6') : '#3b82f6'}
                      recurrence={ev.recurrence}
                      recurringEventId={ev.recurringEventId}
                      onEdit={() => {
                        suppressCreate();
                        const s = new Date(ev.start);
                        const ee = new Date(ev.end);
                        setOpenPopoverFor(null);
                        // Use the master RRULE if available; instances have empty recurrence but recurringEventId set
                        const firstRule = (ev.recurrence && ev.recurrence.find(r => r.toUpperCase().startsWith('RRULE'))) || null;
                        setEditorData({ id: ev.id, start: s, end: ee, title: ev.summary, colorId: ev.colorId, recurrence: firstRule });
                        setEditorOpen(true);
                      }}
                      onDelete={() => { suppressCreate(); setOpenPopoverFor(null); handleDelete(ev); }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simple placeholder month view
  const renderMonth = () => {
    return (
      <div className="p-3 text-gray-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="px-2 py-1 bg-gray-700 rounded">Prev</button>
            <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="px-2 py-1 bg-gray-700 rounded">Next</button>
            <button onClick={() => setCurrent(new Date())} className="px-2 py-1 bg-gray-700 rounded">Today</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchEvents} className="px-2 py-1 bg-gray-700 rounded flex items-center gap-1"><RefreshCw size={14} /> Refresh</button>
            <select value={view} onChange={e => setView(e.target.value as ViewMode)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm">
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
            {loading && (
              <span title="Syncing events" aria-label="Syncing events">
                <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
              </span>
            )}
          </div>
        </div>
        <div className="text-sm opacity-80">Month view coming soon. Use Week view for full editing.</div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col text-white bg-main">
      {view === 'week' ? renderWeekGrid() : renderMonth()}
      {/* Footer removed per request */}

      {/* Editor Dialog */}
      {editorData && (
        <EventEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          initialStart={editorData.start}
          initialEnd={editorData.end}
          initialTitle={editorData.title}
          initialColorId={editorData.colorId}
          initialRecurrence={editorData.recurrence || null}
          onSave={async ({ title, start, end, colorId, recurrence }) => {
            if (editorData.id) {
              const updated = await updateEvent(editorData.id, { summary: title, start, end, colorId, ...(recurrence !== undefined ? { recurrence: recurrence || null } : {}) });
              setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
            } else {
              const ev = await createEvent({ summary: title, start, end, colorId, ...(recurrence ? { recurrence } : {}) });
              setEvents(prev => [...prev, ev]);
            }
          }}
        />
      )}

      {/* Delete recurring dialog */}
      {deleteTarget && (
        <Dialog open={true} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <DialogContent className="sm:max-w-[420px] bg-secondary text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>Delete recurring event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-blue-500"
                  checked={deleteMode === 'instance'}
                  onChange={() => setDeleteMode('instance')}
                />
                <span>This event</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-blue-500"
                  checked={deleteMode === 'following'}
                  onChange={() => setDeleteMode('following')}
                />
                <span>This and following events</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  className="accent-blue-500"
                  checked={deleteMode === 'all'}
                  onChange={() => setDeleteMode('all')}
                />
                <span>All events</span>
              </label>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'OK'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CalendarPanel;
