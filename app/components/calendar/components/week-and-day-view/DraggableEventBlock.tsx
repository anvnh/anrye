"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addMinutes, differenceInMinutes } from "date-fns";

import { EventBlock } from "./EventBlock";
import { useUpdateEvent } from "../../hooks/useUpdateEvent";

import type { CSSProperties, RefObject } from "react";
import type { IEvent } from "../../interfaces";

interface IProps {
  event: IEvent;
  day: Date;
  visibleHoursRange: { from: number; to: number };
  baseStyle: Pick<CSSProperties, "left" | "width"> & Partial<Pick<CSSProperties, "top">>;
  horizontalWeekMeta?: {
    containerRef: RefObject<HTMLDivElement | null>;
    days: Date[];
  };
}

const HOUR_HEIGHT_PX = 96; // Must match grids
const MINUTE_PX = HOUR_HEIGHT_PX / 60; // 1.6px per minute
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;

export function DraggableEventBlock({ event, day, visibleHoursRange, baseStyle, horizontalWeekMeta }: IProps) {
  const { updateEvent } = useUpdateEvent();

  const [draftEvent, setDraftEvent] = useState<IEvent | null>(null);
  const [mode, setMode] = useState<null | "pending-move" | "move" | "resize-top" | "resize-bottom">(null);
  const startPointerYRef = useRef<number>(0);
  const originalEventRef = useRef<IEvent>(event);
  const draggedRef = useRef<boolean>(false);
  const DRAG_PIXEL_THRESHOLD = 4; // pixels
  const suppressUntilRef = useRef<number>(0);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  // Check if any dialog is currently open
  const isDialogOpen = () => {
    return document.querySelectorAll('[role="dialog"]').length > 0;
  };

  useEffect(() => {
    // Reset drafts if external event changes
    originalEventRef.current = event;
    setDraftEvent(null);
    setMode(null);
  }, [event.startDate, event.endDate, event.id]);

  const durationMinutes = useMemo(() => {
    const startDate = new Date(originalEventRef.current.startDate);
    const endDate = new Date(originalEventRef.current.endDate);
    return Math.max(differenceInMinutes(endDate, startDate), MIN_DURATION_MINUTES);
  }, [originalEventRef.current.startDate, originalEventRef.current.endDate]);

  const clampToVisibleRange = useCallback(
    (startDate: Date, endDate: Date) => {
      const dayStart = new Date(day);
      dayStart.setHours(visibleHoursRange.from, 0, 0, 0);

      const dayEnd = new Date(day);
      dayEnd.setHours(visibleHoursRange.to, 0, 0, 0);

      // Ensure within bounds
      if (startDate < dayStart) {
        const clampedStart = new Date(dayStart);
        const clampedEnd = addMinutes(clampedStart, Math.min(durationMinutes, differenceInMinutes(dayEnd, clampedStart)));
        return { start: clampedStart, end: clampedEnd };
      }

      if (endDate > dayEnd) {
        const clampedEnd = new Date(dayEnd);
        const clampedStart = addMinutes(clampedEnd, -durationMinutes);
        return { start: clampedStart, end: clampedEnd };
      }

      return { start: startDate, end: endDate };
    },
    [day, visibleHoursRange.from, visibleHoursRange.to, durationMinutes]
  );

  const roundToStep = (minutes: number, step: number) => Math.round(minutes / step) * step;

  const beginPointerTracking = useCallback((clientY: number) => {
    startPointerYRef.current = clientY;
    originalEventRef.current = draftEvent ?? event;
  }, [draftEvent, event]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!mode) return;
      // Disable drag & drop if any dialog is open
      if (isDialogOpen()) {
        setMode(null);
        setDraftEvent(null);
        return;
      }
      pointerRef.current = { x: e.clientX, y: e.clientY };
      const deltaY = e.clientY - startPointerYRef.current;
      const deltaMinutesRaw = deltaY / MINUTE_PX;
      const deltaMinutes = roundToStep(deltaMinutesRaw, SNAP_MINUTES);
      if (mode === "pending-move") {
        if (Math.abs(deltaY) < DRAG_PIXEL_THRESHOLD) return;
        draggedRef.current = true;
        setMode("move");
      }

      const current = draftEvent ?? originalEventRef.current;
      const startDate = new Date(current.startDate);
      const endDate = new Date(current.endDate);

      if (mode === "move") {
        // Vertical movement (time) first
        const vertStart = addMinutes(new Date(originalEventRef.current.startDate), deltaMinutes);
        const vertEnd = addMinutes(new Date(originalEventRef.current.endDate), deltaMinutes);

        // Determine horizontal target day if week meta is present
        let targetDay = day;
        if (horizontalWeekMeta?.containerRef?.current && horizontalWeekMeta.days?.length) {
          const rect = horizontalWeekMeta.containerRef.current.getBoundingClientRect();
          const totalDays = horizontalWeekMeta.days.length;
          if (rect.width > 0) {
            const xWithin = Math.max(0, Math.min(e.clientX - rect.left, rect.width - 1));
            const colWidth = rect.width / totalDays;
            const dayIndex = Math.max(0, Math.min(Math.floor(xWithin / colWidth), totalDays - 1));
            targetDay = horizontalWeekMeta.days[dayIndex];
          }
        }

        // Merge vertical time with horizontal day
        const newStart = new Date(targetDay);
        newStart.setHours(vertStart.getHours(), vertStart.getMinutes(), 0, 0);
        let newEnd = addMinutes(newStart, durationMinutes);

        // Clamp within visible range for the target day
        const dayStart = new Date(targetDay);
        dayStart.setHours(visibleHoursRange.from, 0, 0, 0);
        const dayEnd = new Date(targetDay);
        dayEnd.setHours(visibleHoursRange.to, 0, 0, 0);

        let clampedStart = newStart;
        let clampedEnd = newEnd;
        if (clampedStart < dayStart) {
          clampedStart = dayStart;
          clampedEnd = addMinutes(clampedStart, Math.min(durationMinutes, differenceInMinutes(dayEnd, clampedStart)));
        } else if (clampedEnd > dayEnd) {
          clampedEnd = dayEnd;
          clampedStart = addMinutes(clampedEnd, -durationMinutes);
        }

        setDraftEvent({ ...current, startDate: clampedStart.toISOString(), endDate: clampedEnd.toISOString() });
      } else if (mode === "resize-bottom") {
        let newEnd = addMinutes(endDate, deltaMinutes);
        // Enforce minimum duration
        if (differenceInMinutes(newEnd, startDate) < MIN_DURATION_MINUTES) {
          newEnd = addMinutes(startDate, MIN_DURATION_MINUTES);
        }
        // Clamp to visible end
        const dayEnd = new Date(day);
        dayEnd.setHours(visibleHoursRange.to, 0, 0, 0);
        if (newEnd > dayEnd) newEnd = dayEnd;

        setDraftEvent({ ...current, startDate: startDate.toISOString(), endDate: newEnd.toISOString() });
      } else if (mode === "resize-top") {
        let newStart = addMinutes(startDate, deltaMinutes);
        // Enforce minimum duration
        if (differenceInMinutes(endDate, newStart) < MIN_DURATION_MINUTES) {
          newStart = addMinutes(endDate, -MIN_DURATION_MINUTES);
        }
        // Clamp to visible start
        const dayStart = new Date(day);
        dayStart.setHours(visibleHoursRange.from, 0, 0, 0);
        if (newStart < dayStart) newStart = dayStart;

        setDraftEvent({ ...current, startDate: newStart.toISOString(), endDate: endDate.toISOString() });
      }
    };

    const handlePointerUp = () => {
      if (!mode) return;
      // Disable drag & drop if any dialog is open
      if (isDialogOpen()) {
        setMode(null);
        setDraftEvent(null);
        return;
      }

      if (draftEvent && (mode === "move" || mode === "resize-top" || mode === "resize-bottom")) {
        updateEvent(draftEvent);
      }

      setMode(null);
      setDraftEvent(null);
      startPointerYRef.current = 0;
      // Suppress the synthetic click that follows pointerup after a drag
      if (draggedRef.current) suppressUntilRef.current = Date.now() + 250;
      draggedRef.current = false;
      pointerRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [mode, draftEvent, updateEvent, day, visibleHoursRange.from, visibleHoursRange.to, horizontalWeekMeta?.containerRef, horizontalWeekMeta?.days, durationMinutes]);

  const computeTopPercent = useCallback((startDateIso: string) => {
    const startDate = new Date(startDateIso);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    const effectiveStart = startDate < dayStart ? dayStart : startDate;
    const startMinutes = differenceInMinutes(effectiveStart, dayStart);

    const visibleStartMinutes = visibleHoursRange.from * 60;
    const visibleEndMinutes = visibleHoursRange.to * 60;
    const visibleRangeMinutes = Math.max(visibleEndMinutes - visibleStartMinutes, 1);

    const top = ((startMinutes - visibleStartMinutes) / visibleRangeMinutes) * 100;
    return `${top}%`;
  }, [day, visibleHoursRange.from, visibleHoursRange.to]);

  const computeTopPercentForDay = useCallback((startDateIso: string, refDay: Date) => {
    const startDate = new Date(startDateIso);
    const dayStart = new Date(refDay);
    dayStart.setHours(0, 0, 0, 0);
    const effectiveStart = startDate < dayStart ? dayStart : startDate;
    const startMinutes = differenceInMinutes(effectiveStart, dayStart);
    const visibleStartMinutes = visibleHoursRange.from * 60;
    const visibleEndMinutes = visibleHoursRange.to * 60;
    const visibleRangeMinutes = Math.max(visibleEndMinutes - visibleStartMinutes, 1);
    const top = ((startMinutes - visibleStartMinutes) / visibleRangeMinutes) * 100;
    return `${top}%`;
  }, [visibleHoursRange.from, visibleHoursRange.to]);

  const computeTopPxForDay = useCallback((startDateIso: string, refDay: Date) => {
    const startDate = new Date(startDateIso);
    const dayStart = new Date(refDay);
    dayStart.setHours(0, 0, 0, 0);
    const effectiveStart = startDate < dayStart ? dayStart : startDate;
    const startMinutes = differenceInMinutes(effectiveStart, dayStart);
    const minutesFromVisibleStart = startMinutes - visibleHoursRange.from * 60;
    return Math.max(0, minutesFromVisibleStart) * MINUTE_PX;
  }, [visibleHoursRange.from]);

  const currentEvent = draftEvent ?? event;
  const style: CSSProperties = {
    position: "absolute",
    padding: 4,
    ...baseStyle,
    top: computeTopPercent(currentEvent.startDate),
  };

  return (
    <>
      {mode && (
        <div
          className="absolute p-1 pointer-events-none opacity-40"
          style={{
            position: "absolute",
            padding: 4,
            ...baseStyle,
            top: computeTopPercent(originalEventRef.current.startDate),
          }}
        >
          <EventBlock event={originalEventRef.current} className="opacity-100" />
        </div>
      )}

      {mode && pointerRef.current && horizontalWeekMeta?.containerRef?.current && horizontalWeekMeta.days?.length && (
        (() => {
          const rect = horizontalWeekMeta.containerRef.current.getBoundingClientRect();
          const totalDays = horizontalWeekMeta.days.length;
          const colWidth = rect.width / totalDays;
          const xWithin = Math.max(0, Math.min(pointerRef.current!.x - rect.left, rect.width - 1));
          const dayIndex = Math.max(0, Math.min(Math.floor(xWithin / colWidth), totalDays - 1));
          const leftPx = dayIndex * colWidth;
          const widthPx = colWidth;
          const targetDay = horizontalWeekMeta.days[dayIndex];
          const topPx = computeTopPxForDay((draftEvent ?? originalEventRef.current).startDate, targetDay);
          const ghost = (
            <div
              className="absolute p-1 pointer-events-none"
              style={{ position: "absolute", padding: 4, left: leftPx, width: widthPx, top: topPx }}
            >
              <EventBlock event={draftEvent ?? originalEventRef.current} className="opacity-100" />
            </div>
          );
          return createPortal(ghost, horizontalWeekMeta.containerRef.current);
        })()
      )}

      <div
        className="absolute p-1"
        style={style}
        data-event-block="true"
        onClickCapture={e => {
          // Swallow the click immediately after pointerup/drag
          if (Date.now() <= suppressUntilRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (draggedRef.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onPointerDown={e => {
          if (e.button !== 0) return;
          // Disable drag & drop if any dialog is open
          if (isDialogOpen()) return;
          beginPointerTracking(e.clientY);
          setMode("pending-move");
        }}
      >
        <div
          className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize"
          onPointerDown={e => {
            e.stopPropagation();
            if (e.button !== 0) return;
            // Disable resize if any dialog is open
            if (isDialogOpen()) return;
            beginPointerTracking(e.clientY);
            setMode("resize-top");
          }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
          onPointerDown={e => {
            e.stopPropagation();
            if (e.button !== 0) return;
            // Disable resize if any dialog is open
            if (isDialogOpen()) return;
            beginPointerTracking(e.clientY);
            setMode("resize-bottom");
          }}
        />

        <div className="cursor-move">
          <EventBlock event={currentEvent} />
        </div>
      </div>
    </>
  );
}


