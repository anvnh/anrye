import { driveService } from '../../services/googleDrive';
import { 
  extractImagesFromMarkdown, 
  removeAllImagesFromMarkdown,
  deleteImageFromDrive,
  cleanupOrphanedImages,
  getImageUsageStats 
} from '../images/imageUtils';

interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
}

interface CleanupOptions {
  removeFromNotes?: boolean;
  removeFromDrive?: boolean;
  dryRun?: boolean;
  noteIds?: string[];
}

/**
 * Bulk cleanup script for removing images from notes and drive
 */
export class ImageCleanupScript {
  private notes: Note[] = [];
  private isSignedIn: boolean = false;

  constructor(notes: Note[], isSignedIn: boolean) {
    this.notes = notes;
    this.isSignedIn = isSignedIn;
  }

  /**
   * Get statistics about image usage
   */
  getStats() {
    return getImageUsageStats(this.notes);
  }

  /**
   * Remove all images from specific notes
   */
  async removeImagesFromNotes(noteIds: string[], options: CleanupOptions = {}) {
    const { dryRun = false, removeFromDrive = true } = options;
    const results: { noteId: string; title: string; imagesRemoved: number; errors: string[] }[] = [];

    for (const noteId of noteIds) {
      const note = this.notes.find(n => n.id === noteId);
      if (!note) {
        results.push({
          noteId,
          title: 'Unknown',
          imagesRemoved: 0,
          errors: ['Note not found']
        });
        continue;
      }

      const images = extractImagesFromMarkdown(note.content);
      const errors: string[] = [];

      if (!dryRun) {
        // Remove images from drive if signed in
        if (this.isSignedIn && removeFromDrive) {
          for (const image of images) {
            if (image.driveFileId) {
              try {
                await deleteImageFromDrive(image.driveFileId);
              } catch (error) {
                errors.push(`Failed to delete image ${image.filename}: ${error}`);
              }
            }
          }
        }
      }

      results.push({
        noteId: note.id,
        title: note.title,
        imagesRemoved: images.length,
        errors
      });
    }

    return results;
  }

  /**
   * Remove all images from all notes
   */
  async removeAllImages(options: CleanupOptions = {}) {
    const { dryRun = false, removeFromDrive = true } = options;
    const noteIds = this.notes.map(note => note.id);
    return this.removeImagesFromNotes(noteIds, { ...options, dryRun, removeFromDrive });
  }

  /**
   * Clean up orphaned images from drive
   */
  async cleanupOrphanedImages() {
    if (!this.isSignedIn) {
      throw new Error('Must be signed in to cleanup orphaned images');
    }

    try {
      const notesFolderId = await driveService.findOrCreateNotesFolder();
      return await cleanupOrphanedImages(this.notes, notesFolderId);
    } catch (error) {
      console.error('Failed to cleanup orphaned images:', error);
      throw error;
    }
  }

  /**
   * Generate a report of image usage
   */
  generateReport() {
    const stats = this.getStats();
    const report = {
      summary: {
        totalNotes: this.notes.length,
        totalImages: stats.totalImages,
        uniqueImages: stats.uniqueImages,
        notesWithImages: this.notes.filter(note => 
          extractImagesFromMarkdown(note.content).length > 0
        ).length
      },
      notesWithImages: this.notes
        .filter(note => extractImagesFromMarkdown(note.content).length > 0)
        .map(note => ({
          id: note.id,
          title: note.title,
          path: note.path,
          imageCount: extractImagesFromMarkdown(note.content).length,
          images: extractImagesFromMarkdown(note.content).map(img => ({
            filename: img.filename,
            url: img.url,
            hasDriveId: !!img.driveFileId
          }))
        })),
      imageUsage: stats.imageUsage
    };

    return report;
  }

  /**
   * Export images from notes to a JSON file
   */
  exportImageData() {
    const allImages: Array<{
      noteId: string;
      noteTitle: string;
      notePath: string;
      filename: string;
      url: string;
      driveFileId?: string;
    }> = [];

    this.notes.forEach(note => {
      const images = extractImagesFromMarkdown(note.content);
      images.forEach(image => {
        allImages.push({
          noteId: note.id,
          noteTitle: note.title,
          notePath: note.path,
          filename: image.filename,
          url: image.url,
          driveFileId: image.driveFileId
        });
      });
    });

    return allImages;
  }
}

/**
 * Utility function to run cleanup with console output
 */
export const runImageCleanup = async (
  notes: Note[], 
  isSignedIn: boolean, 
  options: CleanupOptions = {}
) => {
  const script = new ImageCleanupScript(notes, isSignedIn);
  
  // Image cleanup started
  
  // Generate report
  const report = script.generateReport();
  // Image usage report generated

  // Dry run mode check

  // Cleanup orphaned images if requested
  if (options.removeFromDrive && isSignedIn) {
    try {
      const result = await script.cleanupOrphanedImages();
      // Cleanup completed
    } catch (error) {
      // Cleanup failed
    }
  }

  // Remove images from notes if requested
  if (options.removeFromNotes) {
    const noteIds = options.noteIds || notes.map(n => n.id);
    
    const results = await script.removeImagesFromNotes(noteIds, options);
    // Images removed from notes
  }

  // Cleanup completed
}; 