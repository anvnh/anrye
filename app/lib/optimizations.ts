// Optimization utilities for better performance
import { useMemo, useCallback, useRef, useEffect } from 'react';

// Lazy load Google Drive service
export const loadDriveService = async () => {
  if (typeof window !== 'undefined') {
    try {
      return await import('./googleDrive');
    } catch (error) {
      return null;
    }
  }
  return null;
};

// Lazy load CodeMirror
export const loadCodeMirror = async () => {
  if (typeof window !== 'undefined') {
    try {
      const [
        { EditorView, basicSetup },
        { EditorState },
        { oneDark },
        { javascript },
        { html },
        { css },
        { json },
        { python },
        { markdown },
        { cpp }
      ] = await Promise.all([
        import('codemirror'),
        import('@codemirror/state'),
        import('@codemirror/theme-one-dark'),
        import('@codemirror/lang-javascript'),
        import('@codemirror/lang-html'),
        import('@codemirror/lang-css'),
        import('@codemirror/lang-json'),
        import('@codemirror/lang-python'),
        import('@codemirror/lang-markdown'),
        import('@codemirror/lang-cpp')
      ]);
      
      return {
        EditorView,
        basicSetup,
        EditorState,
        oneDark,
        javascript,
        html,
        css,
        json,
        python,
        markdown,
        cpp
      };
    } catch (error) {
      return null;
    }
  }
  return null;
};

// Lazy load KaTeX
export const loadKaTeX = async () => {
  if (typeof window !== 'undefined') {
    try {
      // Dynamically load KaTeX CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css';
      document.head.appendChild(link);
      
      // Load KaTeX library
      const katex = await import('katex');
      return katex;
    } catch (error) {
      return false;
    }
  }
  return false;
};

// Enhanced debounce function with immediate execution option
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null;
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Advanced throttle with leading and trailing options
export const advancedThrottle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): ((...args: Parameters<T>) => void) => {
  const { leading = true, trailing = true } = options;
  let lastFunc: NodeJS.Timeout | null;
  let lastRan: number;
  
  return (...args: Parameters<T>) => {
    if (!lastRan && leading) {
      func(...args);
      lastRan = Date.now();
    } else {
      if (lastFunc) clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit && trailing) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

// Memoization utility with cache size limit
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  cacheSize: number = 100
): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    
    // Implement LRU cache
    if (cache.size >= cacheSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  }) as T;
};

// React memoization hook
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

// Deep memoization for complex objects
export const useDeepMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const ref = useRef<{ deps: React.DependencyList; value: T } | undefined>(undefined);
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }
  
  return ref.current.value;
};

// Deep equality check
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
    return a === b;
  }
  
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  
  if (a.prototype !== b.prototype) return false;
  
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) {
    return false;
  }
  
  return keys.every(k => deepEqual(a[k], b[k]));
};

// Preload critical resources
export const preloadCriticalResources = () => {
  if (typeof window !== 'undefined') {
    // Preload critical CSS
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = '/globals.css';
    document.head.appendChild(link);

    // Preload critical fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.as = 'font';
    fontLink.href = '/fonts/inter-var.woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);
  }
};

// Optimize localStorage operations
export const optimizedLocalStorage = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  },
  
  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  },
  
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }
};

// Performance monitoring
export const performanceMonitor = {
  start: (name: string) => {
    if (typeof window !== 'undefined' && performance) {
      performance.mark(`${name}-start`);
    }
  },
  
  end: (name: string) => {
    if (typeof window !== 'undefined' && performance) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measure = performance.getEntriesByName(name)[0];
      // Performance measurement completed
      return measure?.duration || 0;
    }
    return 0;
  },
  
  clear: (name?: string) => {
    if (typeof window !== 'undefined' && performance) {
      if (name) {
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
      } else {
        performance.clearMarks();
        performance.clearMeasures();
      }
    }
  }
};

// Intersection Observer utility
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver | null => {
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    return new IntersectionObserver(callback, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
      ...options
    });
  }
  return null;
};

// Resize Observer utility
export const createResizeObserver = (
  callback: ResizeObserverCallback
): ResizeObserver | null => {
  if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
    return new ResizeObserver(callback);
  }
  return null;
};

// Web Worker utility
export const createWebWorker = (workerScript: string): Worker | null => {
  if (typeof window !== 'undefined' && 'Worker' in window) {
    try {
      // Create a blob URL for the worker script to avoid static analysis issues
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      
      // Clean up the blob URL after worker creation
      worker.addEventListener('error', () => URL.revokeObjectURL(workerUrl));
      worker.addEventListener('message', () => URL.revokeObjectURL(workerUrl));
      
      return worker;
    } catch (error) {
      console.warn('Web Worker not supported or failed to create:', error);
      return null;
    }
  }
  return null;
};

// RequestAnimationFrame utility
export const raf = {
  queue: [] as (() => void)[],
  id: null as number | null,
  
  add: (callback: () => void) => {
    raf.queue.push(callback);
    if (!raf.id) {
      raf.id = requestAnimationFrame(raf.flush);
    }
  },
  
  flush: () => {
    const callbacks = raf.queue.splice(0);
    raf.id = null;
    
    callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('RAF callback error:', error);
      }
    });
    
    if (raf.queue.length > 0) {
      raf.id = requestAnimationFrame(raf.flush);
    }
  }
};

// Batch DOM updates
export const batchDOMUpdates = (callback: () => void) => {
  raf.add(callback);
};

// Virtual scrolling utilities
export const getViewportHeight = (): number => {
  return typeof window !== 'undefined' ? window.innerHeight : 0;
};

export const getScrollTop = (element?: HTMLElement): number => {
  if (element) {
    return element.scrollTop;
  }
  return typeof window !== 'undefined' ? window.pageYOffset || document.documentElement.scrollTop : 0;
};

// Image optimization utilities
export const createOptimizedImageUrl = (
  src: string,
  width?: number,
  height?: number,
  quality: number = 80
): string => {
  // This would integrate with your image optimization service
  // For now, return the original src
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());
  
  const queryString = params.toString();
  return queryString ? `${src}?${queryString}` : src;
};

// Bundle splitting utility
export const loadChunk = async (chunkName: string): Promise<any> => {
  try {
    switch (chunkName) {
      case 'codemirror':
        return await loadCodeMirror();
      case 'katex':
        return await loadKaTeX();
      case 'drive':
        return await loadDriveService();
      default:
        throw new Error(`Unknown chunk: ${chunkName}`);
    }
  } catch (error) {
    console.error(`Failed to load chunk ${chunkName}:`, error);
    return null;
  }
};

// Memory management
export const cleanupMemory = () => {
  // Force garbage collection if available (Chrome DevTools)
  if (typeof window !== 'undefined' && 'gc' in window) {
    (window as any).gc();
  }
  
  // Clear performance entries
  performanceMonitor.clear();
};

// Progressive enhancement utility
export const supportsFeature = (feature: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  switch (feature) {
    case 'intersectionObserver':
      return 'IntersectionObserver' in window;
    case 'resizeObserver':
      return 'ResizeObserver' in window;
    case 'webWorker':
      return 'Worker' in window;
    case 'requestIdleCallback':
      return 'requestIdleCallback' in window;
    case 'webGL':
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch {
        return false;
      }
    default:
      return false;
  }
}; 