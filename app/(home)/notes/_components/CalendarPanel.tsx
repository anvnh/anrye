'use client';

import React from 'react';
import { CalendarProvider } from '../../../components/calendar/contexts/CalendarContext';
import { ClientContainer } from '../../../components/calendar/components/ClientContainer';
import { listEvents, CalendarEvent } from '@/app/lib/googleCalendar';
import { useThemeSettings } from '../_hooks';
import type { TCalendarView } from '../../../components/calendar/types';

interface CalendarPanelProps {
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  currentDate?: Date;
  onClose?: () => void;
}

const CalendarPanel: React.FC<CalendarPanelProps> = ({
  onPrev,
  onNext,
  onToday,
  currentDate,
  onClose
}) => {
  const { notesTheme } = useThemeSettings();
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [view, setView] = React.useState<TCalendarView>('week');
  const [internalDate, setInternalDate] = React.useState(currentDate || new Date());
  
  // Enhanced cache with TTL (Time To Live)
  const [eventsCache, setEventsCache] = React.useState<Map<string, { data: CalendarEvent[], timestamp: number, ttl: number }>>(new Map());
  
  // Debounce timer for API calls
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  // Loading states for different parts
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const [isNavigating, setIsNavigating] = React.useState(false);

  // Ensure we always have a valid date
  const effectiveDate = internalDate || currentDate || new Date();

  // Cache TTL settings (5 minutes for events)
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Check if cache entry is still valid
  const isCacheValid = (timestamp: number, ttl: number) => {
    return Date.now() - timestamp < ttl;
  };

  // Generate cache key for a date range
  const getCacheKey = (startDate: Date, endDate: Date) => {
    return `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
  };

  // Get events from cache or fetch if not available
  const getEventsForRange = async (startDate: Date, endDate: Date, forceRefresh = false): Promise<CalendarEvent[]> => {
    const cacheKey = getCacheKey(startDate, endDate);

    // Week view: always fetch fresh (skip cache)
    if (forceRefresh) {
      try {
        const data = await listEvents(startDate, endDate);
        return data;
      } catch (error) {
        console.error('Failed to fetch events:', error);
        return [];
      }
    }
    
    // For other views, check cache first
    if (eventsCache.has(cacheKey)) {
      const cached = eventsCache.get(cacheKey)!;
      if (isCacheValid(cached.timestamp, cached.ttl)) {
        return cached.data;
      }
    }

    // Fetch if not in cache or expired
    try {
      const data = await listEvents(startDate, endDate);
      // Update cache with TTL
      setEventsCache(prev => new Map(prev).set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: CACHE_TTL
      }));
      return data;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  };

  // Debounced fetch function
  const debouncedFetch = React.useCallback((date: Date, viewType: TCalendarView) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsNavigating(true);
      try {
        let startDate: Date, endDate: Date;
        
        if (viewType === 'month') {
          // For month view: get events for entire month
          startDate = new Date(date.getFullYear(), date.getMonth(), 1);
          endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (viewType === 'day') {
          // For day view: get events for the specific day only
          startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // For week view: get events for current week
          startDate = new Date(date);
          startDate.setDate(date.getDate() - date.getDay() + 1);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
        }
        
        const data = await getEventsForRange(startDate, endDate, viewType === 'week');
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setIsNavigating(false);
      }
    }, 150); // 150ms debounce
  }, [getEventsForRange]);

  // Preload events for adjacent weeks/months (optimized)
  const preloadAdjacentEvents = React.useCallback(async (centerDate: Date, viewType: TCalendarView) => {
    if (viewType === 'week') {
      // Skip preloading for week view to ensure fresh loads when navigating weeks
      return;
    } else if (viewType === 'day') {
      // Preload next day for day view
      const nextDay = new Date(centerDate);
      nextDay.setDate(centerDate.getDate() + 1);
      const nextDayStart = new Date(nextDay);
      nextDayStart.setHours(0, 0, 0, 0);
      const nextDayEnd = new Date(nextDay);
      nextDayEnd.setHours(23, 59, 59, 999);

      // Load in background without blocking
      getEventsForRange(nextDayStart, nextDayEnd).catch(console.error);
    } else if (viewType === 'month') {
      // Preload next month for month view
      const nextMonthStart = new Date(centerDate.getFullYear(), centerDate.getMonth() + 1, 1);
      const nextMonthEnd = new Date(centerDate.getFullYear(), centerDate.getMonth() + 2, 0, 23, 59, 59, 999);

      // Load in background without blocking
      getEventsForRange(nextMonthStart, nextMonthEnd).catch(console.error);
    }
  }, [getEventsForRange]);

  // Handle date changes from calendar navigation
  const handleDateChange = (newDate: Date) => {
    setInternalDate(newDate);
    // Use debounced fetch for smooth navigation
    debouncedFetch(newDate, view);
    // Preload adjacent events (skips for week view)
    preloadAdjacentEvents(newDate, view);
  };

  // Handle view changes
  const handleViewChange = (newView: TCalendarView) => {
    setView(newView);
    // Preload events for the new view (skips for week view)
    preloadAdjacentEvents(effectiveDate, newView);
  };

  // Convert your CalendarEvent format to big-calendar IEvent format
  const convertEvents = (events: CalendarEvent[]) => {
    return events.map(event => ({
      id: parseInt(event.id) || Math.random(),
      gEventId: event.id,
      title: event.summary,
      description: event.description || '',
      startDate: event.start,
      endDate: event.end,
      color: mapColorToBigCalendar(event.colorId || '1'),
      user: {
        id: 'default',
        name: 'Default User',
        picturePath: null
      },
      // Recurrence fields for delete options
      recurrence: event.recurrence,
      recurringEventId: event.recurringEventId,
      originalStartTime: event.originalStartTime,
    }));
  };

  // Map your color IDs to big-calendar colors
  const mapColorToBigCalendar = (colorId: string): "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray" => {
    const colorMap: Record<string, "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray"> = {
      '1': 'blue',
      '2': 'green', 
      '3': 'red',
      '4': 'yellow',
      '5': 'purple',
      '6': 'orange'
    };
    return colorMap[colorId] || 'blue';
  };

  // Fetch events when component mounts or date changes
  React.useEffect(() => {
    const fetchEvents = async () => {
      if (isInitialLoading) {
        setIsInitialLoading(false);
      }
      
      setLoading(true);
      try {
        let startDate: Date, endDate: Date;
        
        if (view === 'month') {
          // For month view: get events for entire month
          startDate = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), 1);
          endDate = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (view === 'day') {
          // For day view: get events for the specific day only
          startDate = new Date(effectiveDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(effectiveDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // For week view: get events for current week
          startDate = new Date(effectiveDate);
          startDate.setDate(effectiveDate.getDate() - effectiveDate.getDay() + 1);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
        }
        
        // Get events for the calculated range (always fresh for week view)
        const data = await getEventsForRange(startDate, endDate, view === 'week');
        setEvents(data);
        
        // Preload adjacent events in background (skips for week view)
        preloadAdjacentEvents(effectiveDate, view);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [effectiveDate, view, isInitialLoading]);

  // Preload events when view changes (optimized)
  React.useEffect(() => {
    if (events.length > 0 && !isInitialLoading) {
      preloadAdjacentEvents(effectiveDate, view);
    }
  }, [view, effectiveDate, events.length, isInitialLoading]);

  const convertedEvents = convertEvents(events);

  return (
    <CalendarProvider events={convertedEvents}>
        {/* Calendar Container */}
        <ClientContainer view={view} onViewChange={handleViewChange} loading={loading} onDateChange={handleDateChange} onClose={onClose} />
    </CalendarProvider>
  );
};

export default CalendarPanel;