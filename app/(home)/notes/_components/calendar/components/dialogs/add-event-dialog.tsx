"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useDisclosure, useThemeSettings } from "@/app/(home)/notes/_hooks";
import { useCalendar } from "../../contexts/calendar-context";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { SingleDayPicker } from "@/components/ui/single-day-picker";
import { Form, FormField, FormLabel, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { eventSchema } from "../../schemas";

import type { TimeValue } from "react-aria-components";
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
      });

      setLocalEvents(prev => [...prev, convertGCalToLocal(created)]);

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
    }
  }, [startDate, startTime, form.reset]);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent className={cn(
        "border-none ring-0",
        notesTheme === "light" ? "light-bg-calendar-button" : "bg-main text-white"
      )}>
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>

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
                      className="border-gray-700"
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
                  <FormLabel>
                    Color
                  </FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} defaultValue="blue">
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
          </form>
        </Form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button form="event-form" type="submit" className={cn(
            "",
            notesTheme === "light" ? "light-bg-calendar-button" : "bg-calendar-button text-white"
          )}>
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
