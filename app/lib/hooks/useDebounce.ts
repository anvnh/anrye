import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced debounce hook with immediate execution and cancellation support
 */
export function useDebounce<T>(
  value: T,
  delay: number,
  immediate = false
): [T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(immediate ? value : value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cancel previous timeout
    cancel();

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup on unmount or dependency change
    return cancel;
  }, [value, delay, cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return cancel;
  }, [cancel]);

  return [debouncedValue, cancel];
}

/**
 * Advanced debounce hook with configurable options
 */
export function useAdvancedDebounce<T>(
  value: T,
  options: {
    delay: number;
    immediate?: boolean;
    maxWait?: number;
    leading?: boolean;
    trailing?: boolean;
  }
): [T, () => void, boolean] {
  const { delay, immediate = false, maxWait, leading = false, trailing = true } = options;
  
  const [debouncedValue, setDebouncedValue] = useState<T>(immediate ? value : value);
  const [isPending, setIsPending] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    setIsPending(false);
  }, []);

  const invokeFunc = useCallback((val: T) => {
    setDebouncedValue(val);
    lastInvokeTimeRef.current = Date.now();
    setIsPending(false);
  }, []);

  const leadingEdge = useCallback((val: T) => {
    lastInvokeTimeRef.current = Date.now();
    timeoutRef.current = setTimeout(() => trailingEdge(val), delay);
    return leading ? invokeFunc(val) : debouncedValue;
  }, [delay, leading, invokeFunc, debouncedValue]);

  const trailingEdge = useCallback((val: T) => {
    timeoutRef.current = null;
    if (trailing && lastCallTimeRef.current !== lastInvokeTimeRef.current) {
      return invokeFunc(val);
    }
    setIsPending(false);
    return debouncedValue;
  }, [trailing, invokeFunc, debouncedValue]);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTimeRef.current;
    const timeSinceLastInvoke = now - lastInvokeTimeRef.current;
    
    lastCallTimeRef.current = now;
    setIsPending(true);

    if (timeSinceLastInvoke === 0 && timeSinceLastCall <= delay) {
      leadingEdge(value);
    } else {
      cancel();
      
      if (maxWait && timeSinceLastInvoke >= maxWait) {
        invokeFunc(value);
      } else {
        timeoutRef.current = setTimeout(() => trailingEdge(value), delay);
        
        if (maxWait) {
          maxTimeoutRef.current = setTimeout(() => invokeFunc(value), maxWait - timeSinceLastInvoke);
        }
      }
    }

    return cancel;
  }, [value, delay, maxWait, cancel, leadingEdge, trailingEdge, invokeFunc]);

  return [debouncedValue, cancel, isPending];
}

/**
 * Smart debounce hook that adapts delay based on input frequency
 */
export function useSmartDebounce<T>(
  value: T,
  baseDelay: number = 300,
  maxDelay: number = 1000,
  minDelay: number = 100
): [T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const updateFrequencyRef = useRef<number[]>([]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const calculateAdaptiveDelay = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Track update frequency
    updateFrequencyRef.current.push(timeSinceLastUpdate);
    
    // Keep only last 10 updates for frequency calculation
    if (updateFrequencyRef.current.length > 10) {
      updateFrequencyRef.current.shift();
    }
    
    // Calculate average time between updates
    const avgTimeBetweenUpdates = updateFrequencyRef.current.reduce((a, b) => a + b, 0) / updateFrequencyRef.current.length;
    
    // If updates are frequent (fast typing), use shorter delay
    // If updates are infrequent, use longer delay
    let adaptiveDelay = baseDelay;
    
    if (avgTimeBetweenUpdates < 100) {
      // Very fast updates - reduce delay
      adaptiveDelay = Math.max(minDelay, baseDelay * 0.5);
    } else if (avgTimeBetweenUpdates > 500) {
      // Slow updates - increase delay
      adaptiveDelay = Math.min(maxDelay, baseDelay * 1.5);
    }
    
    lastUpdateTimeRef.current = now;
    return adaptiveDelay;
  }, [baseDelay, maxDelay, minDelay]);

  useEffect(() => {
    cancel();
    
    const adaptiveDelay = calculateAdaptiveDelay();
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, adaptiveDelay);

    return cancel;
  }, [value, cancel, calculateAdaptiveDelay]);

  return [debouncedValue, cancel];
}
