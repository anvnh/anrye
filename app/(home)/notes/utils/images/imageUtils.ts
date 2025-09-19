import { driveService } from '@/app/(home)/notes/services/googleDrive';

export interface ImageInfo {
  markdown: string;
  url: string;
  filename: string;
  driveFileId?: string;
}

/**
 * Extract all image references from markdown content
 */
export const extractImagesFromMarkdown = (content: string): ImageInfo[] => {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: ImageInfo[] = [];
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    const [, alt, url] = match;
    // Prefer the markdown alt text (we set it to the real filename on upload)
    const filenameFromAlt = (alt || '').trim();
    const filename = filenameFromAlt || extractFilenameFromUrl(url);
    const driveFileId = extractDriveFileId(url);
    
    images.push({
      markdown: match[0],
      url,
      filename,
      driveFileId
    });
  }

  return images;
};

/**
 * Extract filename from image URL
 */
export const extractFilenameFromUrl = (url: string): string => {
  // Handle Google Drive URLs
  if (url.includes('drive.google.com')) {
    const filenameMatch = url.match(/[?&]name=([^&]+)/);
    if (filenameMatch) {
      return decodeURIComponent(filenameMatch[1]);
    }
  }
  
  // Handle regular URLs
  const urlParts = url.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  return lastPart.split('?')[0]; // Remove query parameters
};

/**
 * Extract Google Drive file ID from URL
 */
export const extractDriveFileId = (url: string): string | undefined => {
  // Handle Google Drive URLs
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch) {
      return idMatch[1];
    }
    
    // Handle uc?id= format
    const ucMatch = url.match(/uc\?id=([^&]+)/);
    if (ucMatch) {
      return ucMatch[1];
    }
  }
  
  return undefined;
};

/**
 * Remove specific image from markdown content
 */
export const removeImageFromMarkdown = (content: string, imageMarkdown: string): string => {
  return content.replace(imageMarkdown, '').replace(/\n\s*\n/g, '\n').trim();
};

/**
 * Remove all images from markdown content
 */
export const removeAllImagesFromMarkdown = (content: string): string => {
  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '').replace(/\n\s*\n/g, '\n').trim();
};

/**
 * Delete image from Google Drive
 */
export const deleteImageFromDrive = async (driveFileId: string): Promise<boolean> => {
  try {
    await driveService.deleteFile(driveFileId);
    return true;
  } catch (error) {
    console.error('Failed to delete image from Drive:', error);
    return false;
  }
};

/**
 * Clean up orphaned images from Drive
 * This function can be used to remove images that are no longer referenced in any notes
 */
export const cleanupOrphanedImages = async (
  notes: Array<{ content: string }>,
  driveFolderId: string
): Promise<{ deleted: string[], failed: string[] }> => {
  try {
    // Get all files in the drive folder
    const files = await driveService.listFiles(driveFolderId);
    const imageFiles = files.filter(file => 
      file.mimeType?.startsWith('image/') || 
      file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
    );

    // Extract all referenced image IDs from notes
    const referencedImageIds = new Set<string>();
    notes.forEach(note => {
      const images = extractImagesFromMarkdown(note.content);
      images.forEach(img => {
        if (img.driveFileId) {
          referencedImageIds.add(img.driveFileId);
        }
      });
    });

    // Find orphaned images
    const orphanedImages = imageFiles.filter(file => 
      !referencedImageIds.has(file.id)
    );

    // Delete orphaned images
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const image of orphanedImages) {
      try {
        await driveService.deleteFile(image.id);
        deleted.push(image.name);
      } catch (error) {
        console.error(`Failed to delete orphaned image ${image.name}:`, error);
        failed.push(image.name);
      }
    }

    return { deleted, failed };
  } catch (error) {
    console.error('Failed to cleanup orphaned images:', error);
    return { deleted: [], failed: [] };
  }
};

/**
 * Get image usage statistics
 */
export const getImageUsageStats = (notes: Array<{ content: string }>) => {
  const allImages: ImageInfo[] = [];
  const imageUsage: { [filename: string]: number } = {};

  notes.forEach(note => {
    const images = extractImagesFromMarkdown(note.content);
    images.forEach(img => {
      allImages.push(img);
      imageUsage[img.filename] = (imageUsage[img.filename] || 0) + 1;
    });
  });

  return {
    totalImages: allImages.length,
    uniqueImages: Object.keys(imageUsage).length,
    imageUsage,
    allImages
  };
}; 