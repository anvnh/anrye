import { format } from "date-fns";
import { useEffect, useState } from "react";

interface IProps {
  firstVisibleHour: number;
  lastVisibleHour: number;
  visibleHours?: { from: number; to: number }; // Add this prop
}

export function CalendarTimeline({ firstVisibleHour, lastVisibleHour, visibleHours }: IProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentTimePosition = () => {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    // Calculate position in pixels
    // Each hour has a height of 96px
    const hourHeight = 96;
    
    // Use earliestEventHour and latestEventHour for accurate positioning
    // These values are calculated based on actual events and may extend beyond visibleHours
    const startHour = firstVisibleHour; // Use the actual start hour from events
    const endHour = lastVisibleHour;    // Use the actual end hour from events
    
    // Calculate how many hours from the start hour
    const hoursFromStart = currentHour - startHour;
    
    // Calculate position within the current hour (0-96px)
    const positionWithinHour = (currentMinute / 60) * hourHeight;
    
    // Total position in pixels
    const totalPosition = (hoursFromStart * hourHeight) + positionWithinHour;
    
    // Ensure position is within reasonable bounds
    // For hour 24 (00:00), treat it as the end of the day
    const maxPosition = (endHour - startHour) * hourHeight;
    const clampedPosition = Math.max(0, Math.min(totalPosition, maxPosition));
    
    return clampedPosition;
  };

  const formatCurrentTime = () => {
    return format(currentTime, "HH:mm");
  };

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  
  // Use earliestEventHour and latestEventHour for visibility check
  // These values are calculated based on actual events and may extend beyond visibleHours
  const startHour = firstVisibleHour; // Use the actual start hour from events
  const endHour = lastVisibleHour;    // Use the actual end hour from events
  
  // Always show the timeline if we're within the visible hours range
  // Allow some flexibility for edge cases
  // For hour 24 (00:00), treat it as the end of the day
  if (currentHour < startHour - 1 || currentHour > endHour + 1) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 z-50 border-t border-red-500" style={{ top: `${getCurrentTimePosition()}px` }}>
      <div className="absolute left-0 top-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500"></div>
      <div className="absolute -left-18 flex w-16 -translate-y-1/2 justify-end bg-transparent backdrop-blur-2xl pr-1 text-xs font-medium text-primary">
        {formatCurrentTime()}
      </div>
    </div>
  );
}
