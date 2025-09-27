"use client";

import { parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCalendar } from "../../contexts/CalendarContext";
import { useDisclosure, useThemeSettings } from "@/app/(home)/notes/hooks";
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
import { CustomRecurrenceEditor, rruleWeekly, summarizeRRule } from "../shared/CustomRecurrenceEditor";
import { ColorPicker } from "../shared/ColorPicker";

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
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  
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
      const rule = event.recurrence[0];
      setRecurrence(rule);
      // Check if this is a custom rule (not a preset)
      const weekly = rruleWeekly(recurrenceInitialStart);
      const monthly = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${recurrenceInitialStart.getDate()}`;
      const yearly = `RRULE:FREQ=YEARLY;BYMONTHDAY=${recurrenceInitialStart.getDate()};BYMONTH=${recurrenceInitialStart.getMonth() + 1}`;
      const weekday = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
      const presets = new Set<string>(['RRULE:FREQ=DAILY', weekly, monthly, yearly, weekday]);
      if (!presets.has(rule)) {
        setShowCustomEditor(true);
      }
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
  }, [event.recurrence?.length, event.recurringEventId, event.startDate, recurrenceInitialStart]);

  // Fetch recurrence rule from Google Calendar API if needed
  useEffect(() => {
    if (event.recurringEventId && !event.recurrence && !fetchedRecurrenceRule && !isLoadingRecurrence) {
      setIsLoadingRecurrence(true);
      
      getGCalEvent(event.recurringEventId)
        .then(masterEvent => {
          if (masterEvent.recurrence && masterEvent.recurrence.length > 0) {
            const rule = masterEvent.recurrence[0];
            setFetchedRecurrenceRule(rule);
            // Also update the main recurrence state
            setRecurrence(rule);
            // Check if this is a custom rule (not a preset)
            const weekly = rruleWeekly(recurrenceInitialStart);
            const monthly = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${recurrenceInitialStart.getDate()}`;
            const yearly = `RRULE:FREQ=YEARLY;BYMONTHDAY=${recurrenceInitialStart.getDate()};BYMONTH=${recurrenceInitialStart.getMonth() + 1}`;
            const weekday = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
            const presets = new Set<string>(['RRULE:FREQ=DAILY', weekly, monthly, yearly, weekday]);
            if (!presets.has(rule)) {
              setShowCustomEditor(true);
            }
          }
        })
        .catch(error => {
          console.error('EditEventDialog - Failed to fetch master event:', error);
        })
        .finally(() => {
          setIsLoadingRecurrence(false);
        });
    }
  }, [event.recurringEventId, event.recurrence, fetchedRecurrenceRule, isLoadingRecurrence, recurrenceInitialStart]);

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
                      placeholder="Enter a title" data-invalid={fieldState.invalid} {...field} 
                      className="border-gray-700 border-2"
                    />
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
                        className="[&_[data-focus-within]]:ring-0 [&_[data-focus-within]]:outline-none"
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
                          "border-gray-600 [&_[data-focus-within]]:ring-0 [&_[data-focus-within]]:outline-none",
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
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      notesTheme={notesTheme}
                    />
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
                const selectValue = showCustomEditor ? '__custom__' : (!recurrence ? '' : (isCustom ? '__custom__' : recurrence));
                const customLabel = isCustom ? `Custom — ${summarizeRRule(recurrence!, recurrenceInitialStart)}` : 'Custom…';
                return (
                  <select
                    className={`w-full ${notesTheme === 'light' ? 'bg-white text-black' : 'bg-main text-white'} rounded px-3 py-2 text-sm`}
                    value={selectValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__custom__') {
                        setShowCustomEditor(true);
                        // Set a custom rule to trigger the editor
                        const customRule = `RRULE:FREQ=WEEKLY;BYDAY=${['SU','MO','TU','WE','TH','FR','SA'][recurrenceInitialStart.getDay()]}`;
                        setRecurrence(customRule);
                      } else {
                        setShowCustomEditor(false);
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
              {showCustomEditor && (
                <CustomRecurrenceEditor
                  initialStart={recurrenceInitialStart}
                  notesTheme={notesTheme}
                  onCancel={() => {
                    setShowCustomEditor(false);
                    setRecurrence(null);
                  }}
                  initialRRule={recurrence || undefined}
                  onDone={(rule) => {
                    setRecurrence(rule || null);
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
