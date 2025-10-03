import { StorageService } from '../types/storage';
import { isEncryptedData, generateEncryptionPassword, decryptSensitiveData } from '../utils/security/encryption';
import { secureLocalStorage } from '../utils/security/secureLocalStorage';

interface R2Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  accountId?: string;
  publicUrl?: string;
}

class R2Service implements StorageService {
  private config: R2Config | null = null;
  private baseUrl: string = '';

  constructor() {}

  private async loadConfig(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Try to load from secure storage first
      const secureConfig = await secureLocalStorage.getJSON<R2Config>('r2-config');
      if (secureConfig) {
        this.config = secureConfig;
      } else {
        // Fallback to legacy localStorage
        const stored = localStorage.getItem('r2-config');
        if (stored) {
          if (isEncryptedData(stored)) {
            // Decrypt using deterministic password per device
            const password = generateEncryptionPassword();
            const decrypted = await decryptSensitiveData(stored, password);
            this.config = JSON.parse(decrypted);
          } else {
            // Plaintext legacy: parse and migrate to encrypted
            this.config = JSON.parse(stored);
            await secureLocalStorage.setJSON('r2-config', this.config);
          }
        }
      }
      
      if (this.config) {
        if (!this.config.region) this.config.region = 'auto';
        const accountId = this.config.accountId || (typeof process !== 'undefined' ? (process.env as any)?.CF_ACCOUNT_ID || (process.env as any)?.CLOUDFLARE_ACCOUNT_ID : '');
        this.baseUrl = accountId
          ? `https://${this.config.bucket}.${accountId}.r2.cloudflarestorage.com`
          : `https://${this.config.bucket}.${this.config.region}.r2.cloudflarestorage.com`;
      }
    } catch (error) {
      this.config = null;
      this.baseUrl = '';
    }
  }

  private async uploadToR2(file: File, key: string): Promise<string> {
    if (!this.config) {
      throw new Error('R2 configuration not found');
    }

    // Create form data for multipart upload
    const formData = new FormData();
    formData.append('file', file);

    // Upload to R2 via API route with credentials
    const response = await fetch('/api/storage/r2/upload', {
      method: 'POST',
      headers: {
        'X-R2-Bucket': this.config.bucket,
        'X-R2-Region': this.config.region,
        'X-R2-Key': key,
        'X-R2-Access-Key-ID': this.config.accessKeyId,
        'X-R2-Secret-Access-Key': this.config.secretAccessKey,
        'X-R2-Account-Id': this.config.accountId || (process.env as any)?.CF_ACCOUNT_ID || (process.env as any)?.CLOUDFLARE_ACCOUNT_ID || '',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload to R2: ${response.statusText}`);
    }

    const result = await response.json();
    // Prefer virtual-hosted URL, but keep alt path-style as fallback
    (result as any).publicUrl = result.url || result.altUrl;
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
          'X-R2-Access-Key-ID': this.config!.accessKeyId,
          'X-R2-Secret-Access-Key': this.config!.secretAccessKey,
          'X-R2-Account-Id': this.config!.accountId || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete from R2: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      throw new Error('Failed to delete image from R2');
    }
  }

  getImageUrl(fileId: string): string {
    if (!this.config) {
      throw new Error('R2 configuration not found');
    }
    
    // Prefer public development URL (https://pub-xxxxxxxx.r2.dev) for browser access
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${fileId}`;
    }
    
    // Fallback to S3 API endpoint (requires bucket to be public)
    const accountId = this.config.accountId || (typeof process !== 'undefined' ? (process.env as any)?.CF_ACCOUNT_ID || (process.env as any)?.CLOUDFLARE_ACCOUNT_ID : '');
    if (accountId) {
      return `https://${accountId}.r2.cloudflarestorage.com/${this.config.bucket}/${fileId}`;
    }
    return `https://${this.config.bucket}.${this.config.region}.r2.cloudflarestorage.com/${fileId}`;
  }

  async isAuthenticated(): Promise<boolean> {
    await this.loadConfig(); // Ensure config is loaded
    
    if (!this.config) {
      return false;
    }

    try {
      // Test connection by making a POST request with credentials
      const response = await fetch('/api/storage/r2/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket: this.config.bucket,
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
          accountId: this.config.accountId,
        }),
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async authenticate(): Promise<void> {
    // used to validate the configuration
    await this.ensureConfigured();
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.baseUrl = '';
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('r2-config');
    }
  }

  async ensureConfigured(): Promise<void> {
    // Refresh latest config from localStorage in case it was updated recently
    await this.loadConfig();
    if (!this.config) {
      throw new Error('R2 is not configured. Please set up your R2 credentials in settings.');
    }

    // Default region to 'auto' if missing
    if (!this.config.region) {
      this.config.region = 'auto';
    }

    if (!this.config.bucket || !this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error('R2 configuration is incomplete. Please check your settings.');
    }
  }

  // Getter for accessing config (read-only)
  get currentConfig(): R2Config | null {
    return this.config;
  }
}

export const r2Service = new R2Service();
