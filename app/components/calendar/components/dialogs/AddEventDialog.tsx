"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useDisclosure, useThemeSettings } from "@/app/(home)/notes/hooks";
import { useCalendar } from "../../contexts/CalendarContext";
import { useReminderNotifications } from "@/app/lib/hooks/useReminderNotifications";
import { useEventTimeLogic } from "../../hooks/useEventTimeLogic";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormLabel, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CustomRecurrenceEditor, rruleWeekly, summarizeRRule } from "../shared/CustomRecurrenceEditor";
import { ColorPicker } from "../shared/ColorPicker";
import { ReminderSelector } from "../shared/ReminderSelector";
import { DateTimeInputs } from "../shared/DateTimeInputs";

import { eventSchema } from "../../schemas";

import type { TEventFormData } from "../../schemas";
import { cn } from "@/lib/utils";
import { createEvent as createGCalEvent, CalendarEvent as GCalEvent } from "@/app/lib/googleCalendar";

interface IProps {
  children?: React.ReactNode;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddEventDialog({ children, startDate, startTime, open, onOpenChange }: IProps) {
  const { isOpen: internalOpen, onClose, onToggle } = useDisclosure();
  const { notesTheme } = useThemeSettings();
  const { setLocalEvents } = useCalendar();
  const { scheduleEventReminders } = useReminderNotifications();

  // Recurrence state (RRULE string or null)
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [recurrenceCustomMode, setRecurrenceCustomMode] = useState(false);

  // Reminders state
  const [reminders, setReminders] = useState<{
    useDefault: boolean;
    overrides?: Array<{
      minutes: number;
    }>;
  }>({ useDefault: true });

  const isControlled = typeof open !== "undefined";
  const dialogOpen = isControlled ? !!open : internalOpen;
  const handleOpenChange = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      onToggle();
    }
  };

  const form = useForm<TEventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      color: "blue",
      startDate: typeof startDate !== "undefined" ? startDate : undefined,
      startTime: typeof startTime !== "undefined" ? startTime : undefined,
      ...(typeof startDate !== "undefined" && typeof startTime !== "undefined"
        ? (() => {
          const base = new Date(startDate);
          base.setHours(startTime.hour, startTime.minute, 0, 0);
          const end = new Date(base.getTime() + 30 * 60 * 1000);
          return {
            endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate()),
            endTime: { hour: end.getHours(), minute: end.getMinutes() },
          } as Partial<TEventFormData>;
        })()
        : { endDate: typeof startDate !== "undefined" ? startDate : undefined, endTime: undefined }),
    },
  });

  // Use shared time logic hook
  const {
    endTimeModified,
    setEndTimeModified,
    handleStartDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
  } = useEventTimeLogic({ form });

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

  function convertGCalToLocal(e: GCalEvent) {
    return {
      id: parseInt(e.id) || Math.floor(Math.random() * 1e9),
      gEventId: e.id,
      title: e.summary,
      description: e.description || '',
      startDate: e.start,
      endDate: e.end,
      color: mapColorIdToName(e.colorId),
      user: { id: 'default', name: 'Default User', picturePath: null },
      reminders: e.reminders,
    };
  }

  const onSubmit = async (values: TEventFormData) => {
    try {
      const start = new Date(values.startDate as Date);
      start.setHours(values.startTime!.hour, values.startTime!.minute, 0, 0);
      const end = new Date(values.endDate as Date);
      end.setHours(values.endTime!.hour, values.endTime!.minute, 0, 0);

      const colorId = mapColorNameToColorId(values.color);

      const created = await createGCalEvent({
        summary: values.title,
        description: values.description || '',
        start,
        end,
        colorId,
        recurrence: recurrence || undefined,
        reminders: reminders.useDefault ? undefined : {
          ...reminders,
          overrides: reminders.overrides?.map(override => ({
            method: 'popup' as const,
            minutes: override.minutes
          }))
        },
      });

      const localEvent = convertGCalToLocal(created);
      setLocalEvents(prev => [...prev, localEvent]);

      // Schedule reminders for the new event
      if (reminders && !reminders.useDefault) {
        scheduleEventReminders(localEvent);
      }

      handleOpenChange(false);
      form.reset();
    } catch (err) {
      console.error('Failed to create calendar event', err);
      handleOpenChange(false);
    }
  };


  useEffect(() => {
    if (typeof startDate !== "undefined" && typeof startTime !== "undefined") {
      const base = new Date(startDate);
      base.setHours(startTime.hour, startTime.minute, 0, 0);
      const end = new Date(base.getTime() + 30 * 60 * 1000);
      form.reset({
        title: form.getValues("title"),
        description: form.getValues("description"),
        color: form.getValues("color") || "blue",
        startDate,
        startTime,
        endDate: new Date(end.getFullYear(), end.getMonth(), end.getDate()),
        endTime: { hour: end.getHours(), minute: end.getMinutes() },
      });
      // Reset the modification flag when form is reset
      setEndTimeModified(false);
    } else {
      form.reset({
        title: form.getValues("title"),
        description: form.getValues("description"),
        color: form.getValues("color") || "blue",
        startDate,
        startTime,
        endDate: startDate,
        endTime: undefined,
      });
      setEndTimeModified(false);
    }
  }, [startDate, startTime, form.reset]);

  // Build an initialStart Date for recurrence editor from current form values
  const recurrenceInitialStart = useMemo(() => {
    const d = form.getValues("startDate") ?? startDate ?? new Date();
    const t = form.getValues("startTime") ?? startTime ?? { hour: 9, minute: 0 };
    const base = new Date(d as Date);
    base.setHours((t as any).hour || 0, (t as any).minute || 0, 0, 0);
    return base;
  }, [form, startDate, startTime]);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent 
        showCloseButton={false}
        className={cn(
          "border-none ring-0 max-h-[90vh] flex flex-col",
          notesTheme === "light" ? "light-bg-calendar-button" : "bg-main text-white"
        )}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Form {...form}>
            <form id="event-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor="title">Title</FormLabel>

                    <FormControl>
                      <Input
                        id="title"
                        placeholder="Enter a title"
                        className="border-gray-700 border-2"
                        data-invalid={fieldState.invalid}
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DateTimeInputs
                form={form}
                notesTheme={notesTheme}
                onStartDateChange={handleStartDateChange}
                onStartTimeChange={handleStartTimeChange}
                onEndTimeChange={handleEndTimeChange}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Color
                    </FormLabel>
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
                {(() => {
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
                      <Textarea {...field}
                        value={field.value}
                        data-invalid={fieldState.invalid}
                        className="border-gray-700"
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reminders */}
              <div className="space-y-2">
                <ReminderSelector
                  value={reminders}
                  onChange={setReminders}
                  notesTheme={notesTheme}
                />
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0">
          <DialogClose asChild>
            <Button type="button" variant={notesTheme === 'light' ? 'light-outline' : 'dark-outline'}>
              Cancel
            </Button>
          </DialogClose>

          <Button
            form="event-form"
            type="submit"
            variant={notesTheme === 'light' ? 'light-outline' : 'dark-outline'}
          >
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}