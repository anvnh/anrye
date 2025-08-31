"use client";

import { parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCalendar } from "../../contexts/CalendarContext";
import { useDisclosure, useThemeSettings } from "@/app/(home)/notes/_hooks";
import { updateEvent as updateGCalEvent, getEvent as getGCalEvent } from "@/app/lib/googleCalendar";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { SingleDayPicker } from "@/components/ui/single-day-picker";
import { Form, FormField, FormLabel, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { eventSchema } from "../../schemas";

import type { IEvent } from "../../interfaces";
import type { TimeValue } from "react-aria-components";
import type { TEventFormData } from "../../schemas";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface IProps {
  children: React.ReactNode;
  event: IEvent;
}

export function EditEventDialog({ children, event }: IProps) {
  const { isOpen, onClose, onToggle } = useDisclosure();

  const { notesTheme } = useThemeSettings();

  const { setLocalEvents } = useCalendar();



  // Recurrence state (RRULE string or null)
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [recurrenceCustomMode, setRecurrenceCustomMode] = useState(false);
  
  // State for fetched recurrence rule from Google Calendar API
  const [fetchedRecurrenceRule, setFetchedRecurrenceRule] = useState<string | null>(null);
  const [isLoadingRecurrence, setIsLoadingRecurrence] = useState(false);

  function mapColorNameToColorId(color: string | undefined): string | undefined {
    if (!color) return undefined;
    const map: Record<string, string> = {
      blue: '1',
      green: '2',
      red: '3',
      yellow: '4',
      purple: '5',
      orange: '6',
      gray: '8',
    };
    return map[color] || undefined;
  }

  function mapColorIdToName(colorId: string | undefined): "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray" {
    const map: Record<string, "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray"> = {
      '1': 'blue',
      '2': 'green',
      '3': 'red',
      '4': 'yellow',
      '5': 'purple',
      '6': 'orange',
      '8': 'gray',
    };
    return map[colorId || '1'] || 'blue';
  }

  function convertGCalToLocal(e: any) {
    return {
      id: parseInt(e.id) || Math.floor(Math.random() * 1e9),
      title: e.summary,
      description: e.description || '',
      startDate: e.start,
      endDate: e.end,
      color: mapColorIdToName(e.colorId),
      user: { id: 'default', name: 'Default User', picturePath: null },
    };
  }

  const form = useForm<TEventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event.title,
      description: event.description,
      startDate: parseISO(event.startDate),
      startTime: { hour: parseISO(event.startDate).getHours(), minute: parseISO(event.startDate).getMinutes() },
      endDate: parseISO(event.endDate),
      endTime: { hour: parseISO(event.endDate).getHours(), minute: parseISO(event.endDate).getMinutes() },
      color: event.color,
    },
  });

  // Build an initialStart Date for recurrence editor from current form values
  const recurrenceInitialStart = useMemo(() => {
    const d = form.getValues("startDate") ?? parseISO(event.startDate);
    const t = form.getValues("startTime") ?? { hour: parseISO(event.startDate).getHours(), minute: parseISO(event.startDate).getMinutes() };
    const base = new Date(d as Date);
    base.setHours((t as any).hour || 0, (t as any).minute || 0, 0, 0);
    return base;
  }, [form, event.startDate]);

  // Initialize recurrence from existing event
  useEffect(() => {
    // Check if event has recurrence data
    if (event.recurrence && event.recurrence.length > 0) {
      setRecurrence(event.recurrence[0]); // Take the first recurrence rule
    } 
    // If no recurrence array but has recurringEventId, try to construct from event data
    else if (event.recurringEventId) {
      // Try to construct a basic weekly recurrence based on the event's day of week
      const startDate = parseISO(event.startDate);
      const dayOfWeek = startDate.getDay();
      const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const constructedRule = `RRULE:FREQ=WEEKLY;BYDAY=${dayNames[dayOfWeek]}`;
      setRecurrence(constructedRule);
    }
  }, [event.recurrence?.length, event.recurringEventId, event.startDate]);

  // Fetch recurrence rule from Google Calendar API if needed
  useEffect(() => {
    if (event.recurringEventId && !event.recurrence && !fetchedRecurrenceRule && !isLoadingRecurrence) {
      setIsLoadingRecurrence(true);
      
      getGCalEvent(event.recurringEventId)
        .then(masterEvent => {
          if (masterEvent.recurrence && masterEvent.recurrence.length > 0) {
            setFetchedRecurrenceRule(masterEvent.recurrence[0]);
            // Also update the main recurrence state
            setRecurrence(masterEvent.recurrence[0]);
          }
        })
        .catch(error => {
          console.error('EditEventDialog - Failed to fetch master event:', error);
        })
        .finally(() => {
          setIsLoadingRecurrence(false);
        });
    }
  }, [event.recurringEventId, event.recurrence, fetchedRecurrenceRule, isLoadingRecurrence]);

  const onSubmit = async (values: TEventFormData) => {
    try {
      const startDateTime = new Date(values.startDate as Date);
      startDateTime.setHours(values.startTime!.hour, values.startTime!.minute);

      const endDateTime = new Date(values.endDate as Date);
      endDateTime.setHours(values.endTime!.hour, values.endTime!.minute);

      const colorId = mapColorNameToColorId(values.color);

      const gId = event.gEventId || String(event.id);

      // Update in Google Calendar using the Google event id
      const updated = await updateGCalEvent(gId, {
        summary: values.title,
        description: values.description || '',
        start: startDateTime,
        end: endDateTime,
        colorId,
        recurrence: recurrence || undefined,
      });

      // Update local state (preserve gEventId)
      setLocalEvents(prev => prev.map(e => 
        e.id === event.id ? { ...convertGCalToLocal(updated), id: e.id, gEventId: gId } : e
      ));

      onClose();
    } catch (err) {
      console.error('Failed to update calendar event', err);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onToggle}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className={cn(
        "border-gray-700",
        notesTheme === "light" ? "bg-white text-black" : "bg-main text-white"
      )}>
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form id="event-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <FormItem className="flex-1">
                  <FormLabel htmlFor="title">Title</FormLabel>

                  <FormControl>
                    <Input 
                      id="title" 
                      placeholder="Enter a title" data-invalid={fieldState.invalid} {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <SingleDayPicker
                        id="startDate"
                        value={field.value}
                        className={cn(
                          notesTheme === "light" ? "bg-white" : "bg-calendar-button"
                        )}
                        onSelect={date => {
                          field.onChange(date as Date);
                          const currentStartTime = form.getValues("startTime");
                          if (currentStartTime) {
                            const base = new Date(date as Date);
                            base.setHours(currentStartTime.hour, currentStartTime.minute, 0, 0);
                            const end = new Date(base.getTime() + 30 * 60 * 1000);
                            form.setValue("endTime", { hour: end.getHours(), minute: end.getMinutes() }, { shouldValidate: true });
                            form.setValue("endDate", new Date(end.getFullYear(), end.getMonth(), end.getDate()), { shouldValidate: true });
                          } else {
                            form.setValue("endDate", date as Date, { shouldValidate: true });
                          }
                        }}
                        placeholder="Select a date"
                        data-invalid={fieldState.invalid}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <TimeInput
                        value={field.value as TimeValue}
                        onChange={value => {
                          field.onChange(value);
                          const time = value as unknown as { hour: number; minute: number } | undefined;
                          if (time) {
                            const currentStartDate = form.getValues("startDate");
                            if (currentStartDate) {
                              const base = new Date(currentStartDate);
                              base.setHours(time.hour, time.minute, 0, 0);
                              const end = new Date(base.getTime() + 30 * 60 * 1000);
                              form.setValue("endTime", { hour: end.getHours(), minute: end.getMinutes() }, { shouldValidate: true });
                              form.setValue("endDate", new Date(end.getFullYear(), end.getMonth(), end.getDate()), { shouldValidate: true });
                            }
                          }
                        }}
                        hourCycle={12}
                        data-invalid={fieldState.invalid}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <TimeInput
                        className={cn(
                          "border-gray-600",
                        )}
                        value={field.value as TimeValue}
                        onChange={field.onChange} hourCycle={12} data-invalid={fieldState.invalid}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        data-invalid={fieldState.invalid}
                        className={cn(
                          "border-none",
                          notesTheme === "light" ? "bg-white" : "bg-calendar-button"
                        )}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>

                      <SelectContent className="z-[9999]">
                        <SelectItem value="blue">
                          <div className="flex items-center gap-2">
                            <div className="size-3.5 rounded-full bg-blue-600" />
                            Blue
                          </div>
                        </SelectItem>

                        <SelectItem value="green">
                          <div className="flex items-center gap-2">
                            <div className="size-3.5 rounded-full bg-green-600" />
                            Green
                          </div>
                        </SelectItem>

                        <SelectItem value="red">
                          <div className="flex items-center gap-2">
                            <div className="size-3.5 rounded-full bg-red-600" />
                            Red
                          </div>
                        </SelectItem>

                        <SelectItem value="yellow">
                          <div className="flex items-center gap-2">
                            <div className="size-3.5 rounded-full bg-yellow-600" />
                            Yellow
                          </div>
                        </SelectItem>

                        <SelectItem value="purple">
                          <div className="flex items-center gap-2">
                            <div className="size-3.5 rounded-full bg-purple-600" />
                            Purple
                          </div>
                        </SelectItem>

                        <SelectItem value="orange">
                          <div className="flex items-center gap-2">
                            <div className="size-3.5 rounded-full bg-orange-600" />
                            Orange
                          </div>
                        </SelectItem>

                        <SelectItem value="gray">
                          <div className="flex items-center gap-2">
                            <div className="size-3.5 rounded-full bg-neutral-600" />
                            Gray
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurrence */}
            <div className="space-y-2">
              <FormLabel>Repeat</FormLabel>
              {isLoadingRecurrence ? (
                <div className="text-sm text-gray-400">Loading recurrence...</div>
              ) : (() => {
                const weekly = rruleWeekly(recurrenceInitialStart);
                const monthly = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${recurrenceInitialStart.getDate()}`;
                const yearly = `RRULE:FREQ=YEARLY;BYMONTHDAY=${recurrenceInitialStart.getDate()};BYMONTH=${recurrenceInitialStart.getMonth() + 1}`;
                const weekday = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
                const presets = new Set<string>(['RRULE:FREQ=DAILY', weekly, monthly, yearly, weekday]);
                const isCustom = !!recurrence && !presets.has(recurrence);
                const selectValue = recurrenceCustomMode ? '__custom__' : (!recurrence ? '' : (isCustom ? '__custom__' : recurrence));
                const customLabel = isCustom ? `Custom — ${summarizeRRule(recurrence!, recurrenceInitialStart)}` : 'Custom…';
                return (
                  <select
                    className={`w-full ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'} rounded px-3 py-2 text-sm`}
                    value={selectValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__custom__') {
                        setRecurrenceCustomMode(true);
                      } else {
                        setRecurrenceCustomMode(false);
                        setRecurrence(v || null);
                      }
                    }}
                  >
                    <option value="">Does not repeat</option>
                    <option value="RRULE:FREQ=DAILY">Daily</option>
                    <option value={weekly}>{`Weekly on ${recurrenceInitialStart.toLocaleDateString('en-US', { weekday: 'long' })}`}</option>
                    <option value={monthly}>{`Monthly on day ${recurrenceInitialStart.getDate()}`}</option>
                    <option value={yearly}>{`Annually on ${recurrenceInitialStart.getDate()}/${recurrenceInitialStart.getMonth() + 1}`}</option>
                    <option value={weekday}>Every weekday (Mon–Fri)</option>
                    <option value="__custom__">{customLabel}</option>
                  </select>
                );
              })()}
              {recurrenceCustomMode && (
                <CustomRecurrenceEditor
                  initialStart={recurrenceInitialStart}
                  notesTheme={notesTheme}
                  onCancel={() => setRecurrenceCustomMode(false)}
                  initialRRule={recurrence || undefined}
                  onRuleChange={(rule) => setRecurrence(rule)}
                  onDone={(rule) => {
                    setRecurrence(rule || null);
                    setRecurrenceCustomMode(false);
                  }}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>

                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value} 
                      data-invalid={fieldState.invalid}
                      className="border-gray-700"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className={cn(
              notesTheme === "light" ? "light-bg-calendar-button-with-hover" : "bg-calendar-button-with-hover"
            )}>
              Cancel
            </Button>
          </DialogClose>

          <Button form="event-form" type="submit" className={cn(
            notesTheme === "light" ? "light-bg-calendar-button-with-hover" : "bg-calendar-button-with-hover"
          )}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Recurrence helpers (copied from Add Event Dialog) =====
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
    if (freq === 'DAILY') {
      if (interval === 1) {
        return `Repeat every day${endsPart}`;
      } else {
        return `Repeat every ${interval} days${endsPart}`;
      }
    }
    if (freq === 'WEEKLY') {
      const mapNames: Record<string, string> = { SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday' };
      const byday = (kv.get('BYDAY') || '').split(',').filter(Boolean);
      
      if (byday.length === 0) {
        // No specific days, use the base date
        const dayName = mapNames[['SU','MO','TU','WE','TH','FR','SA'][baseDate.getDay()]];
        if (interval === 1) {
          return `Repeat every week on ${dayName}${endsPart}`;
        } else {
          return `Repeat every ${interval} weeks on ${dayName}${endsPart}`;
        }
      } else {
        // Multiple days - show all of them
        const dayNames = byday.map(d => mapNames[d]).join(', ');
        if (interval === 1) {
          return `Repeat every week on ${dayNames}${endsPart}`;
        } else {
          return `Repeat every ${interval} weeks on ${dayNames}${endsPart}`;
        }
      }
    }
    if (freq === 'MONTHLY') {
      if (interval === 1) {
        return `Repeat every month on day ${baseDate.getDate()}${endsPart}`;
      } else {
        return `Repeat every ${interval} months on day ${baseDate.getDate()}${endsPart}`;
      }
    }
    if (freq === 'YEARLY') {
      if (interval === 1) {
        return `Repeat every year on ${baseDate.getDate()}/${baseDate.getMonth() + 1}${endsPart}`;
      } else {
        return `Repeat every ${interval} years on ${baseDate.getDate()}/${baseDate.getMonth() + 1}${endsPart}`;
      }
    }
    return 'Custom…';
  } catch {
    return 'Custom…';
  }
}

type CustomRecurrenceEditorProps = {
  initialStart: Date;
  notesTheme: 'light' | 'dark';
  onCancel: () => void;
  onDone: (rrule: string | null) => void;
  onRuleChange?: (rrule: string) => void;
  initialRRule?: string;
};

function CustomRecurrenceEditor(props: CustomRecurrenceEditorProps) {
  const { initialStart, notesTheme, onCancel, onDone, onRuleChange, initialRRule } = props;
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

  useEffect(() => {
    const r = buildRule();
    onRuleChange && onRuleChange(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freq, interval, days.join(','), endMode, untilDate, count]);

  const dayChips = ['Su','Mo','Tu','We','Th','Fr','Sa'].map((short, idx) => {
    const d = ['SU','MO','TU','WE','TH','FR','SA'][idx];
    return (
      <button
        key={d}
        type="button"
        onClick={() => toggleDay(d)}
        className={`px-2 py-1 rounded-full text-xs border ${days.includes(d) ? (notesTheme === 'light' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-600') : (notesTheme === 'light' ? 'bg-white text-black border-gray-300' : 'bg-main text-white border-gray-600')}`}
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
              className={`ml-2 w-auto ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'}`}
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