/**
 * Global image loading manager to optimize Google Drive image loading
 * Handles caching, concurrent request limiting, and batching
 */

interface LoadingRequest {
  fileId: string;
  resolve: (url: string) => void;
  reject: (error: Error) => void;
  priority: number;
}

interface CacheEntry {
  url: string;
  timestamp: number;
  fullResolution: boolean;
}

class ImageLoadingManager {
  private cache = new Map<string, CacheEntry>();
  private loadingQueue: LoadingRequest[] = [];
  private activeRequests = new Set<string>();
  private maxConcurrentRequests = 3;
  private cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
  private driveService: any = null;
  private isAuthenticated = false;
  private lastAuthCheck = 0;

  // Initialize drive service lazily
  private async initDriveService() {
    if (!this.driveService) {
      try {
        const module = await import('../../../lib/googleDrive');
        this.driveService = module.driveService;
      } catch (error) {
        console.error('Failed to initialize drive service:', error);
        throw error;
      }
    }
  }

  // Check authentication status (cached for 30 seconds)
  private async checkAuthentication(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastAuthCheck < 30000) {
      return this.isAuthenticated;
    }

    try {
      await this.initDriveService();
      this.isAuthenticated = await this.driveService.isSignedIn();
      this.lastAuthCheck = now;
      return this.isAuthenticated;
    } catch {
      this.isAuthenticated = false;
      this.lastAuthCheck = now;
      return false;
    }
  }

  // Get cached image or add to loading queue
  async loadImage(fileId: string, priority: number = 0): Promise<string> {
    // Check cache first
    const cached = this.cache.get(fileId);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiryTime) {
      return cached.url;
    }

    // If already loading, wait for it
    if (this.activeRequests.has(fileId)) {
      return new Promise((resolve, reject) => {
        this.loadingQueue.push({ fileId, resolve, reject, priority });
      });
    }

    return this.processImageLoad(fileId, priority);
  }

  private async processImageLoad(fileId: string, priority: number): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if we're authenticated first
        const isAuth = await this.checkAuthentication();
        
        if (!isAuth) {
          // If not authenticated, return high-quality thumbnail
          const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1024`;
          this.cache.set(fileId, {
            url: thumbnailUrl,
            timestamp: Date.now(),
            fullResolution: false
          });
          resolve(thumbnailUrl);
          return;
        }

        // If authenticated, go directly for full resolution
        if (this.activeRequests.size < this.maxConcurrentRequests) {
          this.loadFullResolution(fileId, resolve, reject);
        } else {
          this.loadingQueue.push({ fileId, resolve, reject, priority });
          this.loadingQueue.sort((a, b) => b.priority - a.priority);
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to load image'));
      }
    });
  }

  private async loadFullResolution(
    fileId: string, 
    resolve: (url: string) => void, 
    reject: (error: Error) => void
  ) {
    this.activeRequests.add(fileId);

    try {
      await this.initDriveService();
      const accessToken = await this.driveService.getAccessToken();
      
      if (!accessToken) {
        // Return existing thumbnail or high-quality fallback
        const cached = this.cache.get(fileId);
        if (cached) {
          resolve(cached.url);
        } else {
          resolve(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1024`);
        }
        return;
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Update cache with full resolution
        this.cache.set(fileId, {
          url,
          timestamp: Date.now(),
          fullResolution: true
        });

        resolve(url);
      } else {
        // Fallback to high-quality thumbnail on error
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1024`;
        resolve(thumbnailUrl);
      }
    } catch (error) {
      console.error('Failed to load full resolution image:', error);
      // Fallback to high-quality thumbnail
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1024`;
      resolve(thumbnailUrl);
    } finally {
      this.activeRequests.delete(fileId);
      this.processQueue();
    }
  }

  private processQueue() {
    while (this.loadingQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      const request = this.loadingQueue.shift()!;
      this.loadFullResolution(request.fileId, request.resolve, request.reject);
    }
  }

  // Clean up expired cache entries
  private cleanCache() {
    const now = Date.now();
    for (const [fileId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiryTime) {
        if (entry.url.startsWith('blob:')) {
          URL.revokeObjectURL(entry.url);
        }
        this.cache.delete(fileId);
      }
    }
  }

  // Clean cache periodically
  constructor() {
    setInterval(() => this.cleanCache(), 60000); // Clean every minute
  }

  // Clear all cache (useful for sign out)
  clearCache() {
    for (const [, entry] of this.cache.entries()) {
      if (entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    }
    this.cache.clear();
    this.isAuthenticated = false;
    this.lastAuthCheck = 0;
  }

  // Force refresh authentication status (useful after page refresh)
  forceAuthRefresh() {
    this.isAuthenticated = false;
    this.lastAuthCheck = 0;
  }
}

// Global singleton instance
export const imageLoadingManager = new ImageLoadingManager();
