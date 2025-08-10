import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { imageLoadingManager } from '../_utils/imageLoadingManager';

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

/**
 * HackMD-like optimized image component
 * 
 * Key Features:
 * - No placeholders during loading (clean, minimal UI)
 * - Only shows when fully loaded (prevents layout shifts)
 * - Prevents frequent re-rendering with stable keys
 * - Efficient caching and loading state management
 * - Supports Google Drive images with optimized loading
 * 
 * Behavior:
 * - Returns null while loading (no placeholder)
 * - Returns null on error (no error UI)
 * - Only renders the actual image when ready
 * - Smooth opacity transition when loaded
 * 
 * Usage:
 * <OptimizedImage
 *   src="https://drive.google.com/file/d/FILE_ID/view"
 *   alt="Description"
 *   className="w-full h-64 object-cover"
 *   priority={1}
 *   onUrlLoaded={(url) => console.log('Image loaded:', url)}
 * />
 */
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
      console.log('OptimizedImage: Direct URL change, src:', src);
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
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
