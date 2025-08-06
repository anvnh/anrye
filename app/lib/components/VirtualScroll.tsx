import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  estimateItemHeight?: (item: T, index: number) => number;
  getItemKey?: (item: T, index: number) => string | number;
}

interface VirtualScrollState {
  scrollTop: number;
  startIndex: number;
  endIndex: number;
  heights: Map<number, number>;
}

/**
 * High-performance virtual scrolling component for large datasets
 */
export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  estimateItemHeight,
  getItemKey
}: VirtualScrollProps<T>) {
  const [state, setState] = useState<VirtualScrollState>({
    scrollTop: 0,
    startIndex: 0,
    endIndex: 0,
    heights: new Map()
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<number, HTMLElement>>(new Map());
  const rafId = useRef<number | null>(null);

  // Calculate dynamic item heights if estimateItemHeight is provided
  const getItemHeight = useCallback((index: number): number => {
    if (state.heights.has(index)) {
      return state.heights.get(index)!;
    }
    if (estimateItemHeight) {
      return estimateItemHeight(items[index], index);
    }
    return itemHeight;
  }, [state.heights, estimateItemHeight, items, itemHeight]);

  // Calculate total height and visible range
  const { totalHeight, visibleRange } = useMemo(() => {
    if (items.length === 0) {
      return { totalHeight: 0, visibleRange: { start: 0, end: 0 } };
    }

    let totalHeight = 0;
    let currentHeight = 0;
    let startIndex = 0;
    let endIndex = 0;
    let foundStart = false;

    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      
      if (!foundStart && currentHeight + height > state.scrollTop) {
        startIndex = Math.max(0, i - overscan);
        foundStart = true;
      }
      
      if (foundStart && currentHeight > state.scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      
      currentHeight += height;
      totalHeight += height;
      
      if (i === items.length - 1) {
        endIndex = Math.min(items.length - 1, i + overscan);
      }
    }

    return {
      totalHeight,
      visibleRange: { start: startIndex, end: endIndex }
    };
  }, [items.length, getItemHeight, state.scrollTop, containerHeight, overscan]);

  // Calculate offset for visible items
  const offsetY = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < visibleRange.start; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [visibleRange.start, getItemHeight]);

  // Handle scroll with RAF optimization
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    
    rafId.current = requestAnimationFrame(() => {
      setState(prev => ({
        ...prev,
        scrollTop,
        startIndex: visibleRange.start,
        endIndex: visibleRange.end
      }));
      
      onScroll?.(scrollTop);
    });
  }, [visibleRange.start, visibleRange.end, onScroll]);

  // Measure actual item heights for dynamic sizing
  const measureItem = useCallback((index: number, element: HTMLElement) => {
    if (estimateItemHeight) {
      const actualHeight = element.getBoundingClientRect().height;
      setState(prev => ({
        ...prev,
        heights: new Map(prev.heights).set(index, actualHeight)
      }));
    }
  }, [estimateItemHeight]);

  // Update item refs and measure heights
  const setItemRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      itemsRef.current.set(index, element);
      measureItem(index, element);
    } else {
      itemsRef.current.delete(index);
    }
  }, [measureItem]);

  // Generate visible items
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i < items.length) {
        const item = items[i];
        const key = getItemKey ? getItemKey(item, i) : i;
        
        items_to_render.push(
          <div
            key={key}
            ref={(el) => setItemRef(i, el)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: getItemHeight(i),
              transform: `translateY(${offsetY + (i - visibleRange.start) * getItemHeight(i)}px)`,
            }}
          >
            {renderItem(item, i)}
          </div>
        );
      }
    }
    return items_to_render;
  }, [items, visibleRange, getItemKey, setItemRef, renderItem, getItemHeight, offsetY]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}

/**
 * Hook for managing virtual scroll state
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    totalHeight,
    offsetY,
    visibleItems: items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  };
}

/**
 * Virtual grid component for 2D virtualization
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number, row: number, col: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  gap?: number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  gap = 0
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const columnsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    );
    
    return { startRow, endRow };
  }, [scrollTop, itemHeight, containerHeight, totalRows, overscan, gap]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = 0; col < columnsPerRow; col++) {
        const index = row * columnsPerRow + col;
        if (index < items.length) {
          const item = items[index];
          const x = col * (itemWidth + gap);
          const y = row * (itemHeight + gap);
          
          items_to_render.push(
            <div
              key={index}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: itemWidth,
                height: itemHeight,
              }}
            >
              {renderItem(item, index, row, col)}
            </div>
          );
        }
      }
    }
    
    return items_to_render;
  }, [items, visibleRange, columnsPerRow, itemWidth, itemHeight, gap, renderItem]);

  const totalHeight = totalRows * (itemHeight + gap) - gap;

  return (
    <div
      className={`virtual-grid-container ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}
