'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Image as ImageIcon,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Edit3
} from 'lucide-react';
import {
  extractImagesFromMarkdown,
  removeImageFromMarkdown,
  removeAllImagesFromMarkdown,
  deleteImageFromDrive,
  cleanupOrphanedImages,
  getImageUsageStats,
  ImageInfo
} from '../utils/imageUtils';
import { Note } from './types';
import { driveService } from '@/app/lib/googleDrive';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import dynamic from 'next/dynamic';
import { OptimizedImage } from './OptimizedImage';

const ImageEditor = dynamic(() => import('./ImageEditor'), { ssr: false });

interface ImageManagerProps {
  notes: Note[];
  selectedNote: Note | null;
  setEditContent: (content: string) => void;
  setNotes?: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote?: React.Dispatch<React.SetStateAction<Note | null>>;
  isSignedIn: boolean;
  onClose: () => void;
}

export const ImageManager: React.FC<ImageManagerProps> = ({
  notes,
  selectedNote,
  setEditContent,
  setNotes,
  setSelectedNote,
  isSignedIn,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set());
  const [cleanupProgress, setCleanupProgress] = useState<{
    isRunning: boolean;
    deleted: string[];
    failed: string[];
  }>({ isRunning: false, deleted: [], failed: [] });

  const [editorState, setEditorState] = useState<{ open: boolean; src: string; driveFileId?: string } | null>(null);

  // Local preview URL cache and fallback tracking
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [fallbackTried, setFallbackTried] = useState<Set<string>>(new Set());

  // Compute a preview URL for an image (Drive and non-Drive)
  const getPreviewUrl = (image: ImageInfo): string => {
    if (image.driveFileId) {
      // Public viewing link created on upload; safe to embed
      // Prefer thumbnail endpoint for small previews
      return `https://drive.google.com/thumbnail?id=${image.driveFileId}&sz=w128`;
    }
    return image.url;
  };

  // Load blob preview using Drive API with access token (CORS-friendly)
  const loadBlobPreview = async (image: ImageInfo, key: string) => {
    if (!image.driveFileId) return;
    try {
      // Check if user is signed in to Google Drive first
      const isSignedIn = await driveService.isSignedIn();
      if (!isSignedIn) {
        console.warn('User not signed in to Google Drive, cannot load image preview');
        return;
      }

      const token = await driveService.getAccessToken();
      if (!token) {
        console.warn('No access token available for image preview - authentication may have expired');
        return;
      }
      const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${image.driveFileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrls(prev => ({ ...prev, [key]: url }));
    } catch (err) {
      // Silent fallback
    }
  };

  // Cleanup object URLs on unmount or when images change
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  // Get image statistics
  const imageStats = useMemo(() => getImageUsageStats(notes), [notes]);

  // Get images from selected note
  const selectedNoteImages = useMemo(() => {
    if (!selectedNote) return [];
    return extractImagesFromMarkdown(selectedNote.content);
  }, [selectedNote]);

  // Handle removing a specific image from the selected note
  const handleRemoveImage = async (image: ImageInfo) => {
    if (!selectedNote) return;

    const imageKey = image.driveFileId || image.url;
    setDeletingImages(prev => new Set(prev).add(imageKey));

    try {
      // Only delete from Drive, keep the markdown link
      if (isSignedIn && image.driveFileId) {
        await deleteImageFromDrive(image.driveFileId);

        // Clear the cache for this file ID since it's been deleted
        const { imageLoadingManager } = await import('../utils/imageLoadingManager');
        imageLoadingManager.clearCacheForFile(image.driveFileId);
      }
    } catch (error) {
      console.error('Failed to remove image:', error);
    } finally {
      setDeletingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageKey);
        return newSet;
      });
    }
  };

  // Handle removing all images from the selected note
  const handleRemoveAllImages = async () => {
    if (!selectedNote) return;

    try {
      setIsLoading(true);

      // Only delete from Drive, keep all markdown links
      if (isSignedIn) {
        for (const image of selectedNoteImages) {
          if (image.driveFileId) {
            await deleteImageFromDrive(image.driveFileId);

            // Clear the cache for this file ID since it's been deleted
            const { imageLoadingManager } = await import('../utils/imageLoadingManager');
            imageLoadingManager.clearCacheForFile(image.driveFileId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to remove all images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cleaning up orphaned images
  const handleCleanupOrphanedImages = async () => {
    if (!isSignedIn) return;

    try {
      setCleanupProgress({ isRunning: true, deleted: [], failed: [] });

      // Get the notes folder ID
      const notesFolderId = await driveService.findOrCreateNotesFolder();

      // Clean up orphaned images
      const result = await cleanupOrphanedImages(notes, notesFolderId);

      setCleanupProgress({
        isRunning: false,
        deleted: result.deleted,
        failed: result.failed
      });
    } catch (error) {
      console.error('Failed to cleanup orphaned images:', error);
      setCleanupProgress({ isRunning: false, deleted: [], failed: [] });
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50 image-manager-overlay">
      <div className="bg-main/95 backdrop-blur-md rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden image-manager">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600 image-manager-header">
          <div className="flex items-center gap-3">
            <ImageIcon className="text-primary" size={24} />
            <h2 className="text-xl font-semibold text-white">Image Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Statistics */}
          <div className="mb-6 p-4 bg-secondary rounded-lg im-panel">
            <h3 className="text-lg font-semibold text-white mb-3">Image Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{imageStats.totalImages}</div>
                <div className="text-sm text-gray-400">Total Images</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{imageStats.uniqueImages}</div>
                <div className="text-sm text-gray-400">Unique Images</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{notes.length}</div>
                <div className="text-sm text-gray-400">Notes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {imageStats.totalImages > 0 ? Math.round((imageStats.uniqueImages / imageStats.totalImages) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-400">Reuse Rate</div>
              </div>
            </div>
          </div>

          {/* Selected Note Images */}
          {selectedNote && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Images in "{selectedNote.title}"
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Deleting removes the file from Drive but keeps the link in your note
                  </p>
                </div>
                {selectedNoteImages.length > 0 && (
                  <button
                    onClick={handleRemoveAllImages}
                    disabled={isLoading}
                    className="
                    flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-700 
                    text-white rounded-lg transition-colors disabled:opacity-50 "
                  >
                    <Trash2 size={16} />
                    Delete All from Drive
                  </button>
                )}
              </div>

              {selectedNoteImages.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No images in this note</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedNoteImages.map((image, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-600 im-card">
                      <div className="flex items-start justify-between mb-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-3 min-w-0 cursor-help">
                              <div className="w-12 h-12 rounded bg-gray-700 flex-shrink-0 overflow-hidden grid place-items-center cursor-pointer" onClick={() => setEditorState({ open: true, src: previewUrls[(image.driveFileId || image.url)] || getPreviewUrl(image), driveFileId: image.driveFileId })}>
                                {/* Thumbnail preview */}
                                <OptimizedImage
                                  src={previewUrls[(image.driveFileId || image.url)] || getPreviewUrl(image)}
                                  alt={image.filename || 'image'}
                                  className="w-full h-full object-cover"
                                  priority={2}
                                  onError={async () => {
                                    const key = image.driveFileId || image.url;
                                    if (image.driveFileId && !fallbackTried.has(key)) {
                                      setFallbackTried(prev => new Set(prev).add(key));
                                      await loadBlobPreview(image, key);
                                    }
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-medium truncate">{image.filename || 'image'}</p>
                                <p className="text-gray-400 text-sm truncate">{image.url}</p>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>
                            {image.filename || 'image'}
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => setEditorState({ open: true, src: previewUrls[(image.driveFileId || image.url)] || getPreviewUrl(image), driveFileId: image.driveFileId })}
                            disabled={isLoading}
                            className="p-1 text-blue-500 hover:text-white rounded transition-colors"
                            title="Edit image"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveImage(image)}
                            disabled={isLoading || deletingImages.has(image.driveFileId || image.url)}
                            className="p-1 hover:bg-red-600 text-red-400 hover:text-white rounded transition-colors ml-2 disabled:opacity-50"
                            title="Delete image from Drive (keeps link in note)"
                          >
                            {deletingImages.has(image.driveFileId || image.url) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                      {image.driveFileId && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle size={12} />
                          Stored in Drive
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cleanup Section */}
          {isSignedIn && (
            <div className="border-t border-gray-600 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Cleanup Orphaned Images</h3>
                  <p className="text-gray-400 text-sm">
                    Remove images from Drive that are no longer referenced in any notes
                  </p>
                </div>
                <button
                  onClick={handleCleanupOrphanedImages}
                  disabled={cleanupProgress.isRunning}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {cleanupProgress.isRunning ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  {cleanupProgress.isRunning ? 'Cleaning...' : 'Cleanup'}
                </button>
              </div>

              {/* Cleanup Results */}
              {(cleanupProgress.deleted.length > 0 || cleanupProgress.failed.length > 0) && (
                <div className="bg-gray-800 rounded-lg p-4">
                  {cleanupProgress.deleted.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <CheckCircle size={16} />
                        <span className="font-medium">Successfully deleted ({cleanupProgress.deleted.length})</span>
                      </div>
                      <div className="text-sm text-gray-300 max-h-20 overflow-y-auto">
                        {cleanupProgress.deleted.map((filename, index) => (
                          <div key={index} className="truncate">{filename}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cleanupProgress.failed.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <AlertTriangle size={16} />
                        <span className="font-medium">Failed to delete ({cleanupProgress.failed.length})</span>
                      </div>
                      <div className="text-sm text-gray-300 max-h-20 overflow-y-auto">
                        {cleanupProgress.failed.map((filename, index) => (
                          <div key={index} className="truncate">{filename}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {editorState?.open && (
          <ImageEditor
            src={editorState.src}
            driveFileId={editorState.driveFileId}
            onClose={() => setEditorState(null)}
            onSaved={(newUrl) => {
              if (editorState?.driveFileId) {
                // Replace preview cache so the updated image is shown without reload
                setPreviewUrls(prev => ({ ...prev, [editorState.driveFileId as string]: newUrl }));
              }
              setEditorState(null);
            }}
          />
        )}
      </div>
    </div>
  );
}; 
