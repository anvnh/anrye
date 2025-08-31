import { useCalendar } from "../contexts/CalendarContext";
import { updateEvent as updateGoogleCalendarEvent } from "@/app/lib/googleCalendar";

import type { IEvent } from "../interfaces";

export function useUpdateEvent() {
  const { setLocalEvents } = useCalendar();

  // Optimistic update local state; sync to Google Calendar if gEventId is present.
  const updateEvent = async (event: IEvent): Promise<void> => {
    const normalized: IEvent = {
      ...event,
      startDate: new Date(event.startDate).toISOString(),
      endDate: new Date(event.endDate).toISOString(),
    };

    let previous: IEvent | null = null;

    setLocalEvents(prev => {
      const index = prev.findIndex(e => e.id === event.id);
      if (index === -1) return prev;
      previous = prev[index];
      return [...prev.slice(0, index), normalized, ...prev.slice(index + 1)];
    });

    // Try to sync with Google Calendar if this event is linked
    if (event.gEventId) {
      try {
        await updateGoogleCalendarEvent(event.gEventId, {
          start: new Date(normalized.startDate),
          end: new Date(normalized.endDate),
        });
      } catch (err) {
        // Revert local change on failure
        if (previous) {
          setLocalEvents(prev => {
            const index = prev.findIndex(e => e.id === event.id);
            if (index === -1) return prev;
            return [...prev.slice(0, index), previous as IEvent, ...prev.slice(index + 1)];
          });
        }
        // Surface error for debugging; consider showing a toast in UI layer
        console.error("Failed to update Google Calendar event", err);
      }
    }
  };

  return { updateEvent };
}
