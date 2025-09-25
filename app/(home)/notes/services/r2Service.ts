import { StorageService } from '../types/storage';

interface R2Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

class R2Service implements StorageService {
  private config: R2Config | null = null;
  private baseUrl: string = '';

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('r2-config');
      if (stored) {
        this.config = JSON.parse(stored);
        this.baseUrl = `https://${this.config?.bucket}.${this.config?.region}.r2.cloudflarestorage.com`;
      }
    }
  }

  private async uploadToR2(file: File, key: string): Promise<string> {
    if (!this.config) {
      throw new Error('R2 configuration not found');
    }

    // Create form data for multipart upload
    const formData = new FormData();
    formData.append('file', file);

    // For R2, we need to use presigned URLs or direct upload
    // This is a simplified implementation - in production, you'd want to use presigned URLs
    const response = await fetch('/api/storage/r2/upload', {
      method: 'POST',
      headers: {
        'X-R2-Bucket': this.config.bucket,
        'X-R2-Region': this.config.region,
        'X-R2-Key': key,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload to R2: ${response.statusText}`);
    }

    const result = await response.json();
    return result.fileId;
  }

  async uploadImage(name: string, imageFile: File, parentId?: string): Promise<string> {
    await this.ensureConfigured();
    
    const timestamp = Date.now();
    const extension = name.split('.').pop() || 'png';
    const key = `images/${parentId || 'default'}/${timestamp}-${name}`;
    
    try {
      const fileId = await this.uploadToR2(imageFile, key);
      return fileId;
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error('Failed to upload image to R2');
    }
  }

  async deleteImage(fileId: string): Promise<void> {
    await this.ensureConfigured();
    
    try {
      const response = await fetch('/api/storage/r2/delete', {
        method: 'DELETE',
        headers: {
          'X-R2-Bucket': this.config!.bucket,
          'X-R2-Key': fileId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete from R2: ${response.statusText}`);
      }
    } catch (error) {
      console.error('R2 delete error:', error);
      throw new Error('Failed to delete image from R2');
    }
  }

  getImageUrl(fileId: string): string {
    if (!this.config) {
      throw new Error('R2 configuration not found');
    }
    
    // Return public URL for R2 object
    return `https://${this.config.bucket}.${this.config.region}.r2.cloudflarestorage.com/${fileId}`;
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      // Test connection by making a simple request
      const response = await fetch('/api/storage/r2/test', {
        method: 'GET',
        headers: {
          'X-R2-Bucket': this.config.bucket,
          'X-R2-Region': this.config.region,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('R2 authentication test failed:', error);
      return false;
    }
  }

  async authenticate(): Promise<void> {
    // R2 authentication is handled through configuration
    // This method can be used to validate the configuration
    await this.ensureConfigured();
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.baseUrl = '';
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('r2-config');
    }
  }

  private async ensureConfigured(): Promise<void> {
    if (!this.config) {
      throw new Error('R2 is not configured. Please set up your R2 credentials in settings.');
    }

    if (!this.config.bucket || !this.config.region || !this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error('R2 configuration is incomplete. Please check your settings.');
    }
  }
}

export const r2Service = new R2Service();
