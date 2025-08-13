'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Eye, Download, Trash2 } from 'lucide-react';
import { DriveImage } from './types';
import { driveService } from '../../../lib/googleDrive';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImagesSectionProps {
  isSignedIn: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onImageUploaded?: () => void;
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({
  isSignedIn,
  isExpanded,
  onToggleExpanded,
  onImageUploaded
}) => {
  const [images, setImages] = useState<DriveImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<DriveImage | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [imageLoadRetries, setImageLoadRetries] = useState<Map<string, number>>(new Map());
  const [imageLoadingStates, setImageLoadingStates] = useState<Set<string>>(new Set());
  const [imageCache, setImageCache] = useState<Map<string, string>>(() => {
    // Load cache from localStorage on mount
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('image-thumbnail-cache');
      if (cached) {
        try {
          const parsedCache = new Map(JSON.parse(cached));
          // console.log('Loaded cache from localStorage:', parsedCache.size, 'items');
          return parsedCache;
        } catch (error) {
          // TODO: Create a proper error display and handling mechanism
          console.error('Failed to parse image cache:', error);
        }
      }
    }
    return new Map();
  });

  const loadImages = async () => {
    if (!isSignedIn) return;

    try {
      setIsLoading(true);
      const imagesList = await driveService.getImagesFromImagesFolder();
      setImages(imagesList);

      // Pre-cache thumbnails for new images
      imagesList.forEach(image => {
        if (!imageCache.has(image.id)) {
          const thumbnailUrl = `https://drive.google.com/thumbnail?id=${image.id}&sz=w200`;
          setImageCache(prev => {
            const newCache = new Map(prev).set(image.id, thumbnailUrl);
            // Save to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('image-thumbnail-cache', JSON.stringify(Array.from(newCache.entries())));
            }
            return newCache;
          });
        }
      });

      // console.log('Image cache size:', imageCache.size);
      // console.log('Cached images:', Array.from(imageCache.keys()));
    } catch (error) {
      // console.error('Failed to load images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && isSignedIn) {
      loadImages();
    }
  }, [isExpanded, isSignedIn]);

  // Preload cached images when component mounts
  useEffect(() => {
    if (isSignedIn && imageCache.size > 0) {
      console.log('Preloading cached images:', imageCache.size);
      // Preload cached images
      imageCache.forEach((url, imageId) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          console.log('Cached image loaded successfully:', imageId);
        };
        img.onerror = () => {
          console.log('Cached image failed to load, removing from cache:', imageId);
          // Remove from cache if failed to load
          setImageCache(prev => {
            const newCache = new Map(prev);
            newCache.delete(imageId);
            if (typeof window !== 'undefined') {
              localStorage.setItem('image-thumbnail-cache', JSON.stringify(Array.from(newCache.entries())));
            }
            return newCache;
          });
        };
      });
    }
  }, [isSignedIn, imageCache.size]);

  // Listen for image upload events
  useEffect(() => {
    const handleImageUploaded = () => {
      if (isExpanded && isSignedIn) {
        // Clear cache when new image is uploaded
        setImageCache(new Map());
        if (typeof window !== 'undefined') {
          localStorage.removeItem('image-thumbnail-cache');
        }
        loadImages();
      }
    };

    // Listen for custom event when image is uploaded
    window.addEventListener('imageUploaded', handleImageUploaded);

    return () => {
      window.removeEventListener('imageUploaded', handleImageUploaded);
    };
  }, [isExpanded, isSignedIn]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const handleImageClick = (image: DriveImage) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        handleCloseModal();
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [selectedImage]);

  const handleDownload = async (image: DriveImage) => {
    try {
      const response = await fetch(`https://drive.google.com/uc?export=download&id=${image.id}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleDelete = async (image: DriveImage) => {
    if (!confirm(`Are you sure you want to delete "${image.name}"?`)) return;

    try {
      await driveService.deleteFile(image.id);
      setImages(prev => prev.filter(img => img.id !== image.id));
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      {/* Images Section Header */}
      <div>
        <div
          className="flex items-center px-3 py-0.5 rounded-lg cursor-pointer group transition-all duration-200 ease-in-out hover:bg-gray-700/60 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          onClick={onToggleExpanded}
        >
          <div className='flex py-3 ml-3 mr-3'>
            <ImageIcon size={16} className="text-green-400 mr-3" />
            <span className="text-gray-300 text-sm font-medium flex-1">Images</span>
            {images.length > 0 && (
              <span className="text-gray-500 text-xs bg-gray-600/50 px-2 py-1 rounded-full">
                {images.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Images Grid */}
      {isExpanded && (
        <div className="mb-4">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-500 text-xs mt-2">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-4">
              <ImageIcon size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">No images yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
                  onClick={() => handleImageClick(image)}
                >
                  {imageLoadErrors.has(image.id) ? (
                    <div className="w-full h-20 bg-gray-700 flex items-center justify-center">
                      <ImageIcon size={24} className="text-gray-500" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageLoadErrors(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(image.id);
                            return newSet;
                          });
                          setImageLoadRetries(prev => {
                            const newMap = new Map(prev);
                            newMap.set(image.id, (newMap.get(image.id) || 0) + 1);
                            return newMap;
                          });
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                        title="Retry"
                      >
                        <span className="text-white text-xs">↻</span>
                      </button>
                    </div>
                  ) : (
                    <img
                      key={`${image.id}-${imageCache.has(image.id) ? 'cached' : 'uncached'}`}
                      src={imageCache.get(image.id) || `https://drive.google.com/thumbnail?id=${image.id}&sz=w200`}
                      alt={image.name}
                      className="w-full h-20 object-cover"
                      loading="lazy"
                      onLoad={() => {
                        // Cache the successful URL
                        if (!imageCache.has(image.id)) {
                          const thumbnailUrl = `https://drive.google.com/thumbnail?id=${image.id}&sz=w200`;
                          setImageCache(prev => {
                            const newCache = new Map(prev).set(image.id, thumbnailUrl);
                            // Save to localStorage
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('image-thumbnail-cache', JSON.stringify(Array.from(newCache.entries())));
                            }
                            return newCache;
                          });
                        }
                      }}
                      onError={() => {
                        setImageLoadErrors(prev => new Set(prev).add(image.id));
                        // Remove from cache if failed
                        setImageCache(prev => {
                          const newCache = new Map(prev);
                          newCache.delete(image.id);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('image-thumbnail-cache', JSON.stringify(Array.from(newCache.entries())));
                          }
                          return newCache;
                        });
                      }}
                    />
                  )}

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(image);
                      }}
                      className="p-1 bg-blue-600/80 hover:bg-blue-500/80 rounded text-white"
                      title="View image"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image);
                      }}
                      className="p-1 bg-green-600/80 hover:bg-green-500/80 rounded text-white"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image);
                      }}
                      className="p-1 bg-red-600/80 hover:bg-red-500/80 rounded text-white"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Image info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                    {image.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0" style={{ backgroundColor: '#31363F', borderColor: '#4a5568' }}>
          <DialogHeader className="p-4 border-b border-gray-600/50">
            <DialogTitle className="text-white flex items-center justify-between">
              <span>{selectedImage?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <img
              src={`https://drive.google.com/uc?export=view&id=${selectedImage?.id}`}
              alt={selectedImage?.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to thumbnail if full image fails
                const target = e.target as HTMLImageElement;
                target.src = `https://drive.google.com/thumbnail?id=${selectedImage?.id}&sz=w800`;
              }}
            />
          </div>

          {/* Image info footer */}
          <div className="p-4 border-t border-gray-600/50 bg-gray-800/50">
            <div className="text-sm text-gray-300">
              <span>{formatFileSize(selectedImage?.size || 0)}</span>
              <span className="mx-3">•</span>
              <span>{selectedImage ? formatDate(selectedImage.modifiedTime) : ''}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
