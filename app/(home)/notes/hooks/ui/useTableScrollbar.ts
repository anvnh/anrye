import { useEffect, useCallback } from 'react';

/**
 * Hook to ensure consistent horizontal scrollbar behavior across all browsers
 * for markdown tables that exceed viewport width
 */
export const useTableScrollbar = () => {
  const ensureScrollbarVisibility = useCallback(() => {
    // Find all markdown table containers
    const tableContainers = document.querySelectorAll('.md-table');
    
    tableContainers.forEach((container) => {
      const element = container as HTMLElement;
      const table = element.querySelector('table');
      
      if (!table) return;
      
      // Check if table content is wider than container
      const containerWidth = element.clientWidth;
      const tableWidth = table.scrollWidth;
      
      if (tableWidth > containerWidth) {
        // Force scrollbar to be visible
        element.style.overflowX = 'auto';
        
        // Additional browser-specific fixes
        if (navigator.userAgent.includes('Firefox')) {
          // Firefox-specific: ensure scrollbar is visible
          element.style.scrollbarWidth = 'auto';
          element.style.scrollbarGutter = 'stable';
        } else if (navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Safari')) {
          // Webkit browsers: ensure scrollbar styling
          element.style.webkitOverflowScrolling = 'touch';
        }
        
        // Force a reflow to ensure scrollbar appears
        element.offsetHeight;
      }
    });
  }, []);

  // Run on mount and when content changes
  useEffect(() => {
    // Initial check
    ensureScrollbarVisibility();
    
    // Set up mutation observer to watch for table changes
    const observer = new MutationObserver(() => {
      ensureScrollbarVisibility();
    });
    
    // Observe the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Also listen for resize events
    const handleResize = () => {
      setTimeout(ensureScrollbarVisibility, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [ensureScrollbarVisibility]);

  return {
    ensureScrollbarVisibility
  };
};
