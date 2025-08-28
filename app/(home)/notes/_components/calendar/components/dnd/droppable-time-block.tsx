"use client";

import { useDrop } from "react-dnd";
import { parseISO, differenceInMilliseconds, format } from "date-fns";
import { useUpdateEvent } from "../../hooks/use-update-event";

import { cn } from "@/lib/utils";
import { ItemTypes } from "./draggable-event";

import type { IEvent } from "../../interfaces";

interface DroppableTimeBlockProps {
  date: Date;
  hour: number;
  minute: number;
  children: React.ReactNode;
}

export function DroppableTimeBlock({ date, hour, minute, children }: DroppableTimeBlockProps) {
  const { updateEvent } = useUpdateEvent();

  const [{ isOver, canDrop, item }, drop] = useDrop(
    () => ({
      accept: ItemTypes.EVENT,
      drop: (dragItem: { event: IEvent }) => {
        const droppedEvent = dragItem.event;

        const eventStartDate = parseISO(droppedEvent.startDate);
        const eventEndDate = parseISO(droppedEvent.endDate);

        const eventDurationMs = differenceInMilliseconds(eventEndDate, eventStartDate);

        const newStartDate = new Date(date);
        newStartDate.setHours(hour, minute, 0, 0);
        const newEndDate = new Date(newStartDate.getTime() + eventDurationMs);

        updateEvent({
          ...droppedEvent,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
        });

        return { moved: true };
      },
      collect: monitor => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
        item: monitor.getItem() as { event: IEvent } | null,
      }),
    }),
    [date, hour, minute, updateEvent]
  );

  let previewLabel: string | null = null;
  if (isOver && canDrop && item?.event) {
    const dragged = item.event;
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    const dur = differenceInMilliseconds(parseISO(dragged.endDate), parseISO(dragged.startDate));
    const end = new Date(start.getTime() + dur);
    previewLabel = `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  }

  return (
    <div ref={drop as unknown as React.RefObject<HTMLDivElement>} className={cn("h-[24px] relative", isOver && canDrop && "bg-accent/50")}
    >
      {children}
      {previewLabel && (
        <div className="w-full pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-[9999] rounded-md bg-black/90 px-2 py-1 text-xs font-semibold text-white shadow-lg border border-white/20">
          {previewLabel}
        </div>
      )}
    </div>
  );
}
