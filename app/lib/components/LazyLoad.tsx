import React, { useState, useRef, useEffect, useCallback } from 'react';
import { debounce } from '../optimizations';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  preload?: boolean;
}

/**
 * Lazy loading image component with intersection observer
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  style,
  loading = 'lazy',
  onLoad,
  onError,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  preload = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(preload ? src : null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Setup intersection observer
  useEffect(() => {
    if (!imgRef.current || isInView || preload) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
          setImageSrc(src);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, threshold, rootMargin, isInView, preload]);

  // Preload image when src changes
  useEffect(() => {
    if (preload && src) {
      setImageSrc(src);
    }
  }, [src, preload]);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={`lazy-image-container ${className}`} style={style}>
      {!isLoaded && placeholder && (
        <div className="lazy-image-placeholder">
          {typeof placeholder === 'string' ? (
            <img src={placeholder} alt={`${alt} placeholder`} />
          ) : (
            placeholder
          )}
        </div>
      )}
      
      <img
        ref={imgRef}
        src={imageSrc || undefined}
        alt={alt}
        className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          ...style
        }}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

/**
 * Hook for lazy loading any content
 */
export function useLazyLoad(threshold = 0.1, rootMargin = '50px') {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, isInView]);

  return { ref, isInView };
}

/**
 * Lazy loading wrapper component
 */
interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  style?: React.CSSProperties;
  once?: boolean;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  style,
  once = true
}) => {
  const { ref, isInView } = useLazyLoad(threshold, rootMargin);
  const [hasBeenInView, setHasBeenInView] = useState(false);

  useEffect(() => {
    if (isInView && !hasBeenInView) {
      setHasBeenInView(true);
    }
  }, [isInView, hasBeenInView]);

  const shouldRender = once ? hasBeenInView : isInView;

  return (
    <div ref={ref} className={className} style={style}>
      {shouldRender ? children : fallback}
    </div>
  );
};

/**
 * Preload images utility
 */
export class ImagePreloader {
  private cache = new Map<string, Promise<HTMLImageElement>>();
  private loaded = new Set<string>();

  preload(src: string): Promise<HTMLImageElement> {
    if (this.loaded.has(src)) {
      return Promise.resolve(new Image());
    }

    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.loaded.add(src);
        resolve(img);
      };
      
      img.onerror = () => {
        this.cache.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });

    this.cache.set(src, promise);
    return promise;
  }

  preloadMultiple(srcs: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(srcs.map(src => this.preload(src)));
  }

  isLoaded(src: string): boolean {
    return this.loaded.has(src);
  }

  clear(): void {
    this.cache.clear();
    this.loaded.clear();
  }
}

// Global image preloader instance
export const imagePreloader = new ImagePreloader();

/**
 * Progressive image loading component
 */
interface ProgressiveImageProps {
  src: string;
  lowQualitySrc?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  lowQualitySrc,
  alt,
  className = '',
  style,
  onLoad,
  onError,
  sizes
}) => {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

  // Load high quality image
  useEffect(() => {
    if (!lowQualitySrc || isHighQualityLoaded) return;

    imagePreloader.preload(src)
      .then(() => {
        setCurrentSrc(src);
        setIsHighQualityLoaded(true);
      })
      .catch(() => {
        onError?.();
      });
  }, [src, lowQualitySrc, isHighQualityLoaded, onError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`progressive-image ${isLoaded ? 'loaded' : 'loading'} ${className}`}
      style={{
        filter: isHighQualityLoaded ? 'none' : 'blur(2px)',
        transition: 'filter 0.3s ease',
        ...style
      }}
      sizes={sizes}
      onLoad={handleLoad}
      onError={onError}
    />
  );
};

/**
 * Asset preloader for CSS, JS, and other resources
 */
export class AssetPreloader {
  private loadedAssets = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();

  preloadCSS(href: string): Promise<void> {
    if (this.loadedAssets.has(href)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(href)) {
      return this.loadingPromises.get(href)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      
      link.onload = () => {
        this.loadedAssets.add(href);
        resolve();
      };
      
      link.onerror = () => {
        this.loadingPromises.delete(href);
        reject(new Error(`Failed to preload CSS: ${href}`));
      };
      
      document.head.appendChild(link);
    });

    this.loadingPromises.set(href, promise);
    return promise;
  }

  preloadJS(src: string): Promise<void> {
    if (this.loadedAssets.has(src)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = src;
      
      link.onload = () => {
        this.loadedAssets.add(src);
        resolve();
      };
      
      link.onerror = () => {
        this.loadingPromises.delete(src);
        reject(new Error(`Failed to preload JS: ${src}`));
      };
      
      document.head.appendChild(link);
    });

    this.loadingPromises.set(src, promise);
    return promise;
  }

  preloadFont(href: string, type = 'font/woff2'): Promise<void> {
    if (this.loadedAssets.has(href)) {
      return Promise.resolve();
    }

    if (this.loadingPromises.has(href)) {
      return this.loadingPromises.get(href)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = type;
      link.href = href;
      link.crossOrigin = 'anonymous';
      
      link.onload = () => {
        this.loadedAssets.add(href);
        resolve();
      };
      
      link.onerror = () => {
        this.loadingPromises.delete(href);
        reject(new Error(`Failed to preload font: ${href}`));
      };
      
      document.head.appendChild(link);
    });

    this.loadingPromises.set(href, promise);
    return promise;
  }
}

// Global asset preloader instance
export const assetPreloader = new AssetPreloader();

/**
 * Hook for preloading assets on component mount
 */
export function useAssetPreloader(assets: {
  images?: string[];
  css?: string[];
  js?: string[];
  fonts?: string[];
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const { images = [], css = [], js = [], fonts = [] } = assets;
    const total = images.length + css.length + js.length + fonts.length;
    
    setTotalCount(total);
    setLoadedCount(0);
    setIsLoading(total > 0);

    if (total === 0) {
      setIsLoading(false);
      return;
    }

    let loaded = 0;
    const incrementLoaded = () => {
      loaded++;
      setLoadedCount(loaded);
      if (loaded === total) {
        setIsLoading(false);
      }
    };

    // Preload images
    images.forEach(src => {
      imagePreloader.preload(src)
        .then(incrementLoaded)
        .catch(incrementLoaded);
    });

    // Preload CSS
    css.forEach(href => {
      assetPreloader.preloadCSS(href)
        .then(incrementLoaded)
        .catch(incrementLoaded);
    });

    // Preload JS
    js.forEach(src => {
      assetPreloader.preloadJS(src)
        .then(incrementLoaded)
        .catch(incrementLoaded);
    });

    // Preload fonts
    fonts.forEach(href => {
      assetPreloader.preloadFont(href)
        .then(incrementLoaded)
        .catch(incrementLoaded);
    });
  }, [assets]);

  return {
    isLoading,
    progress: totalCount > 0 ? (loadedCount / totalCount) * 100 : 100
  };
}
