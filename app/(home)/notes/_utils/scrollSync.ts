import { useRef } from 'react';

export const useScrollSync = () => {
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollSource = useRef<'raw' | 'preview' | null>(null);
  const scrollThrottleRef = useRef<number | null>(null);

  const cleanupTimeouts = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    if (scrollThrottleRef.current) {
      clearTimeout(scrollThrottleRef.current);
    }
  };

  return {
    scrollTimeoutRef,
    lastScrollSource,
    scrollThrottleRef,
    cleanupTimeouts,
  };
}; 