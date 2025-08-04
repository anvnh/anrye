'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Download, X } from 'lucide-react';
import { MilestoneImage } from './types';
import { driveService } from '@/app/lib/googleDrive';

interface MilestoneImageViewerProps {
  images: MilestoneImage[];
  onImageDelete?: (imageId: string) => void;
  isEditing?: boolean;
}

export const MilestoneImageViewer: React.FC<MilestoneImageViewerProps> = ({
  images,
  onImageDelete,
  isEditing = false
}) => {
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load image URLs from Google Drive
  useEffect(() => {
    const loadImageUrls = async () => {
      for (const image of images) {
        if (image.driveFileId && !imageUrls[image.id]) {
          setLoadingImages(prev => new Set(prev).add(image.id));
          
          try {
            // Get access token first
            const accessToken = await driveService.getAccessToken();
            if (!accessToken) {
              console.error(`No access token available for image ${image.name}`);
              continue;
            }

            // Get the file content as blob from Google Drive API
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${image.driveFileId}?alt=media`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            if (response.ok) {
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              setImageUrls(prev => ({ ...prev, [image.id]: url }));
            } else {
              console.error(`Failed to load image ${image.name}: ${response.status}`);
            }
          } catch (error) {
            console.error(`Failed to load image ${image.name}:`, error);
          } finally {
            setLoadingImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(image.id);
              return newSet;
            });
          }
        }
      }
    };

    if (images.length > 0) {
      loadImageUrls();
    }

    // Cleanup object URLs when component unmounts
    return () => {
      Object.values(imageUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [images]);

  if (images.length === 0) {
    return null;
  }

  const handleImageClick = (imageId: string) => {
    if (imageUrls[imageId]) {
      setSelectedImage(imageId);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    if (onImageDelete) {
      onImageDelete(imageId);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon size={16} className="text-primary" />
        <span className="text-sm font-medium text-gray-300">
          Images ({images.length})
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((image) => (
          <div key={image.id} className="relative group">
            <div 
              className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-600 cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleImageClick(image.id)}
            >
              {loadingImages.has(image.id) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : imageUrls[image.id] ? (
                <img
                  src={imageUrls[image.id]}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  onError={() => {
                    console.error(`Failed to load image: ${image.name}`);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ImageIcon size={24} />
                </div>
              )}
            </div>

            {/* Delete button for editing mode */}
            {isEditing && onImageDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteImage(image.id);
                }}
                className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            )}

            {/* Image name tooltip */}
            <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-75 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity truncate">
              {image.name}
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && imageUrls[selectedImage] && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors z-10"
            >
              <X size={20} />
            </button>
            
            <img
              src={imageUrls[selectedImage]}
              alt={images.find(img => img.id === selectedImage)?.name || ''}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {images.find(img => img.id === selectedImage)?.name}
                </span>
                <a
                  href={imageUrls[selectedImage]}
                  download
                  className="flex items-center gap-2 px-3 py-1 bg-primary hover:bg-blue-600 rounded transition-colors"
                >
                  <Download size={16} />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
