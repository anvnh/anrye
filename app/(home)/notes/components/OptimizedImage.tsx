import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { imageLoadingManager } from '../utils/imageLoadingManager';

interface OptimizedImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  onClick?: (event: React.MouseEvent<HTMLImageElement>) => void;
  onLoad?: () => void;
  onError?: () => void;
  priority?: number;
  onUrlLoaded?: (url: string) => void;
}


export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  src,
  alt = 'Image',
  className = '',
  width,
  height,
  onClick,
  onLoad,
  onError,
  priority = 0,
  onUrlLoaded
}) => {
  // Extract file ID for Google Drive images
  const fileId = useMemo(() => {
    if (src && typeof src === 'string' && src.includes('drive.google.com') && !src.startsWith('blob:')) {
      return src.match(/id=([^&]+)/)?.[1];
    }
    return null;
  }, [src]);

  // Stable key to prevent re-rendering
  const stableKey = useMemo(() => {
    if (fileId) return `drive-${fileId}`;
    if (src && typeof src === 'string') return `url-${src}`;
    return `img-${Math.random().toString(36).substr(2, 9)}`;
  }, [fileId, src]);

  // State management
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle Google Drive images
  useEffect(() => {
    if (!fileId) {
      // Regular image - set URL directly
      setImageUrl(src);
      setIsLoading(false);
      setHasError(false);
      setIsLoaded(false);
      onUrlLoaded?.(src);
      return;
    }

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        setIsLoaded(false);

        // Subscribe to loading state changes
        unsubscribe = imageLoadingManager.subscribeToLoading(fileId, (loading) => {
          if (!isCancelled) {
            setIsLoading(loading);
          }
        });

        // Load the image
        const url = await imageLoadingManager.loadImage(fileId, priority);
        
        if (!isCancelled) {
          setImageUrl(url);
          setIsLoading(false);
          setHasError(false);
          onUrlLoaded?.(url);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load image:', error);
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }
      }
    };

    // Small delay to prevent overwhelming on initial page load
    const timeoutId = setTimeout(loadImage, Math.random() * 100 + 50);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fileId, priority, onError, onUrlLoaded]);

  // Handle direct URL changes (for edited images)
  useEffect(() => {
    if (!fileId && src) {
      
      // For non-Drive images or when src changes directly
      setImageUrl(src);
      setIsLoading(false);
      setHasError(false);
      setIsLoaded(false);
      onUrlLoaded?.(src);
    }
  }, [src, fileId, onUrlLoaded]);

  // Handle regular image loading
  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  // Don't render anything if loading
  if (isLoading) {
    return null;
  }

  // Show error state if image failed to load
  if (hasError) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded border border-gray-600 text-gray-400">
        <div className="text-center p-4">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-xs">Image not found</div>
        </div>
      </div>
    );
  }

  // Don't render if no URL
  if (!imageUrl) {
    return null;
  }

  // Only render the image when we have a URL and it's not loading
  return (
    <img
      key={stableKey}
      src={imageUrl}
      alt={alt}
      className={`optimized-image ${isLoaded ? 'loaded' : 'loading'} ${className}`}
      width={width}
      height={height}
      onLoad={handleImageLoad}
      onError={handleImageError}
      onClick={onClick}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.className === nextProps.className &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.priority === nextProps.priority &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onLoad === nextProps.onLoad &&
    prevProps.onError === nextProps.onError &&
    prevProps.onUrlLoaded === nextProps.onUrlLoaded
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
