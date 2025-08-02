// Optimization utilities for better performance

// Lazy load Google Drive service
export const loadDriveService = async () => {
  if (typeof window !== 'undefined') {
    try {
      return await import('./googleDrive');
    } catch (error) {
      console.error('Failed to load Google Drive service:', error);
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
      console.error('Failed to load CodeMirror:', error);
      return null;
    }
  }
  return null;
};

// Lazy load KaTeX
export const loadKaTeX = async () => {
  if (typeof window !== 'undefined') {
    try {
      await import('katex/dist/katex.min.css');
      return true;
    } catch (error) {
      console.error('Failed to load KaTeX:', error);
      return false;
    }
  }
  return false;
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
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
      console.error('Failed to get from localStorage:', error);
      return null;
    }
  },
  
  set: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to set to localStorage:', error);
      return false;
    }
  },
  
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
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
      console.log(`${name} took ${measure.duration}ms`);
    }
  }
}; 