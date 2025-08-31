"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Text, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditEventDialog } from "./EditEventDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

import type { IEvent } from "../../interfaces";
import { cn } from "@/lib/utils";
import { Noto_Serif_Thai } from "next/font/google";
import { useThemeSettings } from "@/app/(home)/notes/_hooks/useThemeSettings";
import { useCalendar } from "../../contexts/CalendarContext";
import { deleteEvent as deleteGCalEvent, deleteRecurringScope, getEvent as getGCalEvent } from "@/app/lib/googleCalendar";
import { 
  AlertDialog, 
  AlertDialogTrigger, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter as AlertFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from "@/components/ui/alert-dialog";

interface IProps {
  event: IEvent;
  children: React.ReactNode;
}

export function EventDetailsDialog({ event, children }: IProps) {
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const { notesTheme } = useThemeSettings();
  const { setLocalEvents } = useCalendar();

  // State for fetched recurrence rule
  const [fetchedRecurrenceRule, setFetchedRecurrenceRule] = React.useState<string | null>(null);
  const [isLoadingRecurrence, setIsLoadingRecurrence] = React.useState(false);



  const hasRecurring = !!(event.recurringEventId || (event.recurrence || []).some(r => r && r.toUpperCase().startsWith("RRULE")));
  const [deleteMode, setDeleteMode] = React.useState<"instance" | "following" | "all">("instance");

  // Fetch recurrence rule from Google Calendar API if needed
  React.useEffect(() => {
    if (event.recurringEventId && !event.recurrence && !fetchedRecurrenceRule && !isLoadingRecurrence) {
      setIsLoadingRecurrence(true);
      
      getGCalEvent(event.recurringEventId)
        .then(masterEvent => {
          if (masterEvent.recurrence && masterEvent.recurrence.length > 0) {
            setFetchedRecurrenceRule(masterEvent.recurrence[0]);
          }
        })
        .catch(error => {
          console.error('EventDetailsDialog - Failed to fetch master event:', error);
        })
        .finally(() => {
          setIsLoadingRecurrence(false);
        });
    }
  }, [event.recurringEventId, event.recurrence, fetchedRecurrenceRule, isLoadingRecurrence]);

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

      // Build the main description
      let description = '';
      
      if (freq === 'DAILY') {
        if (interval === 1) {
          description = 'Repeat every day';
        } else {
          description = `Repeat every ${interval} days`;
        }
      } else if (freq === 'WEEKLY') {
        const mapNames: Record<string, string> = { 
          SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', 
          TH: 'Thursday', FR: 'Friday', SA: 'Saturday' 
        };
        const byday = (kv.get('BYDAY') || '').split(',').filter(Boolean);
        
        if (byday.length === 0) {
          // No specific days, use the base date
          const dayName = mapNames[['SU','MO','TU','WE','TH','FR','SA'][baseDate.getDay()]];
          if (interval === 1) {
            description = `Repeat every week on ${dayName}`;
          } else {
            description = `Repeat every ${interval} weeks on ${dayName}`;
          }
        } else {
          // Multiple days - show all of them
          const dayNames = byday.map(d => mapNames[d]).join(', ');
          if (interval === 1) {
            description = `Repeat every week on ${dayNames}`;
          } else {
            description = `Repeat every ${interval} weeks on ${dayNames}`;
          }
        }
      } else if (freq === 'MONTHLY') {
        if (interval === 1) {
          description = `Repeat every month on day ${baseDate.getDate()}`;
        } else {
          description = `Repeat every ${interval} months on day ${baseDate.getDate()}`;
        }
      } else if (freq === 'YEARLY') {
        if (interval === 1) {
          description = `Repeat every year on ${baseDate.getDate()}/${baseDate.getMonth() + 1}`;
        } else {
          description = `Repeat every ${interval} years on ${baseDate.getDate()}/${baseDate.getMonth() + 1}`;
        }
      } else {
        description = 'Custom recurrence';
      }
      
      return description + endsPart;
    } catch {
      return 'Custom recurrence';
    }
  }

  const handleDelete = async () => {
    try {
      const googleId = event.gEventId || String(event.id);
      if (!hasRecurring) {
        await deleteGCalEvent(googleId);
        setLocalEvents(prev => prev.filter(e => e.id !== event.id));
        return;
      }
      await deleteRecurringScope({
        eventId: googleId,
        mode: deleteMode,
        recurringEventId: event.recurringEventId,
        originalStartTime: event.originalStartTime,
      });
      setLocalEvents(prev => prev.filter(e => {
        if (deleteMode === 'instance') return e.id !== event.id;
        if (deleteMode === 'all' && event.recurringEventId) return e.recurringEventId !== event.recurringEventId;
        if (deleteMode === 'following' && event.recurringEventId && event.originalStartTime) {
          return !(e.recurringEventId === event.recurringEventId && !!e.originalStartTime && e.originalStartTime >= event.originalStartTime);
        }
        return true;
      }));
    } catch (e) {
      console.error('Failed to delete calendar event', e);
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent className={cn(
          "border-gray-700",
          notesTheme === "light" ? "bg-white text-black" : "bg-main text-white"
        )}>
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <Calendar className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">Date & Time</p>
                <p className="text-sm text-muted-foreground">
                  {format(startDate, "MMM d, yyyy")} · {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                </p>
              </div>
            </div>

            {hasRecurring && (
              <div className="flex items-start gap-2">
                <Clock className="mt-1 size-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Repeat</p>
                  <p className="text-sm text-muted-foreground">
                    {isLoadingRecurrence ? (
                      <span className="text-gray-400">Loading recurrence...</span>
                    ) : (() => {
                      let recurrenceRule;
                      if (event.recurrence && event.recurrence.length > 0) {
                        // Event has its own recurrence rule
                        recurrenceRule = event.recurrence[0];
                      } else if (fetchedRecurrenceRule) {
                        // Use fetched recurrence rule from master event
                        recurrenceRule = fetchedRecurrenceRule;
                      } else if (event.recurringEventId) {
                        // Fallback: construct basic rule from event data while loading
                        const dayOfWeek = startDate.getDay();
                        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
                        recurrenceRule = `RRULE:FREQ=WEEKLY;BYDAY=${dayNames[dayOfWeek]}`;
                      } else {
                        recurrenceRule = 'RRULE:FREQ=WEEKLY';
                      }
                      
                      const result = summarizeRRule(recurrenceRule, startDate);
                      return result;
                    })()}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Text className="mt-1 size-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center gap-2">
              {/* Confirm delete dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    className={cn(
                      notesTheme === "light" ? "text-red-600 hover:text-red-700 hover:bg-red-600/10" : "text-red-400 hover:text-red-500 hover:bg-red-500/10 bg-calendar-button-with-hover",
                      "w-auto"
                    )}
                  >
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={cn(
                  notesTheme === "light" ? "bg-white text-black" : "bg-main text-white"
                )}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{hasRecurring ? 'Delete recurring event' : 'Delete this event?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {hasRecurring ? 'Choose how you want to delete this recurring event.' : 'This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {hasRecurring && (
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="del-mode" checked={deleteMode === 'instance'} onChange={() => setDeleteMode('instance')} />
                        <span>Only this event</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="del-mode" checked={deleteMode === 'following'} onChange={() => setDeleteMode('following')} />
                        <span>This event and following</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="del-mode" checked={deleteMode === 'all'} onChange={() => setDeleteMode('all')} />
                        <span>All events</span>
                      </label>
                    </div>
                  )}

                  <AlertFooter>
                    <AlertDialogCancel className={cn(
                      notesTheme === "light" ? "" : "bg-calendar-button-with-hover"
                    )}>
                      Cancel
                    </AlertDialogCancel>
                    <DialogClose asChild className={cn(
                      notesTheme === "light" ? "text-red-600 hover:text-red-700 hover:bg-red-600/10" : "text-red-400 hover:text-red-500 hover:bg-red-500/10 bg-calendar-button-with-hover",
                      "w-auto"
                    )}>
                      <AlertDialogAction onClick={handleDelete}>
                        Delete
                      </AlertDialogAction>
                    </DialogClose>
                  </AlertFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Edit button opens edit dialog */}
              <EditEventDialog event={event}>
                <Button type="button" variant="outline" className={cn(
                  notesTheme === "light" ? "light-bg-calendar-button-with-hover" : "bg-calendar-button-with-hover"
                )}>
                  Edit
                </Button>
              </EditEventDialog>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
