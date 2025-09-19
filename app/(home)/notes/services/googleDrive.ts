import '../../../lib/types';
import { getGoogleClientId, isGoogleClientIdConfigured } from '../../../lib/env';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  refresh_expires_at?: number; // Refresh token expiry (much longer)
}



class GoogleDriveService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private readonly TOKEN_KEY = 'google_drive_token';
  private readonly BACKUP_TOKEN_KEY = 'google_drive_token_backup';
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private readonly CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  private readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

  constructor() {
    // Load saved token on initialization (only on client-side)
    if (typeof window !== 'undefined') {
      this.loadSavedToken();
    }
  }

  private saveToken(accessToken: string, expiresIn?: number, refreshToken?: string): void {
    if (typeof window === 'undefined') return;

    // Use provided expiry time or default to 1 hour
    const expiryDuration = expiresIn ? (expiresIn * 1000) : (3600 * 1000); // Convert to milliseconds
    const expiresAt = Date.now() + expiryDuration;

    // Refresh token typically expires in 6 months, but we'll be conservative
    const refreshExpiresAt = refreshToken ? Date.now() + (180 * 24 * 60 * 60 * 1000) : undefined; // 180 days (6 months)

    const tokenData: TokenData = {
      access_token: accessToken,
      expires_at: expiresAt,
      ...(refreshToken && {
        refresh_token: refreshToken,
        refresh_expires_at: refreshExpiresAt
      })
    };

    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
    // Backup token to sessionStorage for better persistence
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(this.BACKUP_TOKEN_KEY, JSON.stringify(tokenData));
    }
  }

  private loadSavedToken(): void {
    if (typeof window === 'undefined') return;

    try {
      // Try localStorage first
      let savedToken = localStorage.getItem(this.TOKEN_KEY);
      let tokenData: TokenData | null = null;

      if (savedToken) {
        try {
          tokenData = JSON.parse(savedToken);
        } catch (e) {
          // Invalid JSON in localStorage, try backup
          savedToken = null;
        }
      }

      // If no valid token in localStorage, try sessionStorage backup
      if (!tokenData && typeof window !== 'undefined' && window.sessionStorage) {
        const backupToken = sessionStorage.getItem(this.BACKUP_TOKEN_KEY);
        if (backupToken) {
          try {
            tokenData = JSON.parse(backupToken);
            // Restore to localStorage if backup is valid
            localStorage.setItem(this.TOKEN_KEY, backupToken);
          } catch (e) {
            // Invalid backup too
          }
        }
      }

      if (tokenData) {
        const timeUntilExpiry = tokenData.expires_at - Date.now();

        if (timeUntilExpiry > 10 * 60 * 1000) { // At least 10 minutes left
          this.accessToken = tokenData.access_token;
          this.refreshToken = tokenData.refresh_token || null;
        } else if (timeUntilExpiry > 0) {
          // Token expires soon, but still valid - keep it but mark for refresh
          this.accessToken = tokenData.access_token;
          this.refreshToken = tokenData.refresh_token || null;
        } else {
          // Token expired, check if we have valid refresh token
          if (tokenData.refresh_token && tokenData.refresh_expires_at) {
            const refreshTimeLeft = tokenData.refresh_expires_at - Date.now();
            if (refreshTimeLeft > 0) {
              // Refresh token still valid, keep it for refresh
              this.refreshToken = tokenData.refresh_token;
              this.accessToken = null; // Clear expired access token

            } else {
              // Both tokens expired
              localStorage.removeItem(this.TOKEN_KEY);
              if (typeof window !== 'undefined' && window.sessionStorage) {
                sessionStorage.removeItem(this.BACKUP_TOKEN_KEY);
              }
              this.accessToken = null;
              this.refreshToken = null;
            }
          } else {
            // No refresh token, clear everything
            localStorage.removeItem(this.TOKEN_KEY);
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.removeItem(this.BACKUP_TOKEN_KEY);
            }
            this.accessToken = null;
            this.refreshToken = null;
          }
        }
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.TOKEN_KEY);
        if (window.sessionStorage) {
          sessionStorage.removeItem(this.BACKUP_TOKEN_KEY);
        }
      }
    }
  }

  private async validateAndRefreshToken(): Promise<boolean> {
    try {
      const saved = localStorage.getItem(this.TOKEN_KEY);
      if (!saved) {
        // thử refresh từ cookie server
        return await this.refreshWithRefreshToken();
      }

      const tokenData: TokenData = JSON.parse(saved);
      const left = tokenData.expires_at - Date.now();
      if (left > 10 * 60 * 1000) {
        this.accessToken = tokenData.access_token;
        return true;
      }

      // sắp hết hạn hoặc đã hết hạn -> refresh
      if (this.isRefreshing && this.refreshPromise) return this.refreshPromise;
      this.isRefreshing = true;
      this.refreshPromise = this.refreshWithRefreshToken();
      const ok = await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return ok;
    } catch {
      return false;
    }
  }

  private async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<Response> {
    const isValid = await this.validateAndRefreshToken();
    if (!isValid || !this.accessToken) {
      throw new Error('NO_TOKEN'); // đừng gọi signIn() ở đây
    }

    let response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${this.accessToken}` },
    });

    if (response.status === 401) {
      // thử refresh 1 lần rồi retry
      const ok = await this.refreshWithRefreshToken();
      if (ok && this.accessToken) {
        response = await fetch(url, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${this.accessToken}` },
        });
      }
    }
    return response;
  }

  // Public method to re-load token on client-side
  public reloadSavedToken(): void {
    this.loadSavedToken();
  }

  private clearSavedToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      // Also clear any session backup to avoid resurrecting old tokens
      try {
        if (window.sessionStorage) {
          sessionStorage.removeItem(this.BACKUP_TOKEN_KEY);
        }
      } catch { }
    }
    this.accessToken = null;
    this.refreshToken = null;
  }

  private async refreshWithRefreshToken(): Promise<boolean> {
    try {
      const r = await fetch("/api/auth/google/token", { method: "POST" });
      if (!r.ok) return false;
      const j = await r.json();
      if (!j?.access_token) return false;

      this.accessToken = j.access_token;
      // Cache access token ngắn hạn (không lưu refresh)
      this.saveToken(j.access_token, j.expires_in /* no refresh */);
      return true;
    } catch {
      return false;
    }
  }


  async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {

      if (window.gapi?.client?.drive) {
        resolve();
        return;
      }

      // Load Google API script for Drive API only
      const loadGapi = () => {
        return new Promise<void>((gapiResolve, gapiReject) => {
          if (window.gapi?.client?.drive) {
            gapiResolve();
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => {
            window.gapi.load('client', async () => {
              try {
                await window.gapi.client.init({
                  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });

                // Verify that drive API is loaded
                if (!window.gapi.client.drive) {
                  gapiReject(new Error('Google Drive API failed to load'));
                  return;
                }

                gapiResolve();
              } catch (error) {
                gapiReject(error);
              }
            });
          };
          script.onerror = () => {
            gapiReject(new Error('Failed to load Google API script'));
          };
          document.head.appendChild(script);
        });
      };

      // Only load GAPI for Drive API - no longer need GSI
      loadGapi()
        .then(() => {
          resolve();
        })
        .catch(reject);
    });
  }
  async signIn(): Promise<boolean> {
    try {
      const origin = encodeURIComponent(
        typeof window !== "undefined" ? window.location.pathname : "/"
      );
      window.location.href = `/api/auth/google?origin=${origin}`;
      return false;
    } catch {
      return false;
    }
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.clearSavedToken();
    // Also clear any temporary tokens that might be lingering
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('google_drive_tokens_temp');
      }
    } catch { }
  }

  // Force clear all tokens and restart authentication
  public async forceReAuthenticate(): Promise<boolean> {
    // Clear everything
    this.accessToken = null;
    this.refreshToken = null;
    this.clearSavedToken();

    // Force fresh sign in
    return await this.signIn();
  }

  // Reset Google API completely
  public async resetGoogleAPI(): Promise<void> {
    // Clear everything
    this.accessToken = null;
    this.refreshToken = null;
    this.clearSavedToken();

    // Clear GAPI client
    if (window.gapi?.client) {
      try {
        window.gapi.client.setToken({ access_token: '' });
        // Force reload API
        await window.gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
      } catch (e) {
        // Error resetting GAPI client
      }
    }
  }

  // Public method to manually refresh token
  public async refreshAccessToken(): Promise<boolean> {
    try {
      // Always try server-side cookie refresh first (works even without this.refreshToken)
      const success = await this.refreshWithRefreshToken();
      if (success) return true;
      // Fallback: force re-authentication only when cookie refresh fails
      return await this.forceReAuthenticate();
    } catch (error) {
      // Token refresh error -> last resort re-auth
      return await this.forceReAuthenticate();
    }
  }

  async isSignedIn(): Promise<boolean> {
    return this.accessToken !== null;
  }

  // Get token status for debugging
  public getTokenStatus(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    accessTokenExpiresAt?: string;
    refreshTokenExpiresAt?: string;
    timeUntilAccessExpiry?: string;
    timeUntilRefreshExpiry?: string;
  } {
    const result: any = {
      hasAccessToken: !!this.accessToken,
      hasRefreshToken: !!this.refreshToken,
    };

    if (typeof window !== 'undefined') {
      try {
        const savedToken = localStorage.getItem(this.TOKEN_KEY);
        if (savedToken) {
          const tokenData: TokenData = JSON.parse(savedToken);

          if (tokenData.expires_at) {
            result.accessTokenExpiresAt = new Date(tokenData.expires_at).toLocaleString();
            const timeLeft = tokenData.expires_at - Date.now();
            if (timeLeft > 0) {
              const minutes = Math.floor(timeLeft / (1000 * 60));
              const hours = Math.floor(minutes / 60);
              const days = Math.floor(hours / 24);

              if (days > 0) {
                result.timeUntilAccessExpiry = `${days} ngày ${hours % 24} giờ`;
              } else if (hours > 0) {
                result.timeUntilAccessExpiry = `${hours} giờ ${minutes % 60} phút`;
              } else {
                result.timeUntilAccessExpiry = `${minutes} phút`;
              }
            } else {
              result.timeUntilAccessExpiry = 'Đã hết hạn';
            }
          }

          if (tokenData.refresh_expires_at) {
            result.refreshTokenExpiresAt = new Date(tokenData.refresh_expires_at).toLocaleString();
            const timeLeft = tokenData.refresh_expires_at - Date.now();
            if (timeLeft > 0) {
              const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
              result.timeUntilRefreshExpiry = `${days} ngày`;
            } else {
              result.timeUntilRefreshExpiry = 'Đã hết hạn';
            }
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return result;
  }

  private async setAccessToken(): Promise<void> {
    const ok = await this.validateAndRefreshToken();
    if (!ok || !this.accessToken) {
      throw new Error("NO_TOKEN");
    }
    if (window.gapi?.client) {
      window.gapi.client.setToken({ access_token: this.accessToken });
    }
  }

  private async ensureApiLoaded(): Promise<void> {
    if (!window.gapi?.client?.drive) {
      await this.loadGoogleAPI();
    }

    // Double check that drive API is available
    if (!window.gapi?.client?.drive) {
      throw new Error('Google Drive API is not loaded. Please try signing in again.');
    }
  }

  private async handleApiError(error: { status?: number }): Promise<boolean> {
    // Check if error is due to invalid/expired token
    if (error.status === 401 || error.status === 403) {
      this.clearSavedToken();
      this.accessToken = null;



      return true; // Indicates token needs refresh
    }
    return false;
  }

  private async makeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: unknown) {
      // Google Drive API call failed

      // Check if it's a specific GAPI error
      if (typeof error === 'object' && error !== null) {
        const gapiError = error as any;
        if (gapiError.message && gapiError.message.includes('gapi.client.drive is undefined')) {
          throw new Error("can't access property \"files\", window.gapi.client.drive is undefined. Please try signing in again.");
        }
      }

      // Check for common error patterns
      if (error instanceof Error) {
        if (error.message.includes('gapi.client.drive is undefined') ||
          error.message.includes('Cannot read properties of undefined')) {
          throw new Error("can't access property \"files\", window.gapi.client.drive is undefined. Please try signing in again.");
        }
      }

      const needsRefresh = await this.handleApiError(error as { status?: number });
      if (needsRefresh) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    const metadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    };

    return this.makeApiCall(async () => {
      const response = await window.gapi.client.drive.files.create({
        resource: metadata
      });
      return response.result.id;
    });
  }

  async uploadFile(name: string, content: string, parentId?: string): Promise<string> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
      'name': name,
      'parents': parentId ? [parentId] : undefined,
      'mimeType': 'application/octet-stream'
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/markdown\r\n\r\n' +
      content +
      close_delim;

    const request = window.gapi.client.request({
      'path': 'https://www.googleapis.com/upload/drive/v3/files',
      'method': 'POST',
      'params': { 'uploadType': 'multipart' },
      'headers': {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      'body': multipartRequestBody
    });

    const response = await request;
    return response.result.id;
  }

  async updateFile(fileId: string, content: string): Promise<void> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    await window.gapi.client.request({
      path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media' },
      headers: { 'Content-Type': 'text/markdown' },
      body: content
    });
  }

  async getFile(fileId: string): Promise<string> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    return response.body;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    await window.gapi.client.drive.files.delete({
      fileId: fileId
    });
  }

  async renameFile(fileId: string, newName: string): Promise<void> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    await window.gapi.client.request({
      path: `https://www.googleapis.com/drive/v3/files/${fileId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName
      })
    });
  }

  // Move a file or folder to a new parent folder without changing its ID
  async moveFile(fileId: string, newParentId: string): Promise<void> {
    await this.ensureApiLoaded();
    await this.setAccessToken();

    // Get current parents
    const metaResp = await window.gapi.client.request({
      path: `https://www.googleapis.com/drive/v3/files/${fileId}`,
      method: 'GET',
      params: { fields: 'parents' }
    });
    // gapi typings can be loose; prefer parsing body to access custom fields
    const bodyJson = (() => { try { return JSON.parse((metaResp as any).body || '{}'); } catch { return {}; } })();
    const currentParents: string[] = (bodyJson.parents as string[]) || [];

    // Compute removeParents (everything except the new parent)
    const removeParents = currentParents.filter(p => p !== newParentId).join(',');

    // If already in the target parent and no other parents, nothing to do
    if (removeParents.length === 0 && currentParents.includes(newParentId)) {
      return;
    }

    // Execute the move by updating parents
    await window.gapi.client.request({
      path: `https://www.googleapis.com/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: {
        addParents: newParentId,
        ...(removeParents ? { removeParents } : {}),
        fields: 'id,parents'
      }
    });
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    await window.gapi.client.request({
      path: `https://www.googleapis.com/drive/v3/files/${folderId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName
      })
    });
  }

  async updateImageFile(fileId: string, imageBlob: Blob, mimeType: string): Promise<void> {
    await this.ensureApiLoaded();
    await this.setAccessToken();

    // Convert Blob to base64
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        // result like data:image/png;base64,xxxx
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {}; // keep existing name/mimeType

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      close_delim;

    await window.gapi.client.request({
      path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
      body: multipartRequestBody
    });
  }

  async listFiles(parentId?: string): Promise<DriveFile[]> {
    await this.ensureApiLoaded();
    await this.setAccessToken();
    let query = "trashed=false";
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await window.gapi.client.drive.files.list({
      q: query,
      fields: 'files(id,name,mimeType,parents,createdTime,modifiedTime)',
      orderBy: 'name'
    });

    return response.result.files || [];
  }

  async findOrCreateNotesFolder(): Promise<string> {
    try {
      await this.ensureApiLoaded();
      await this.setAccessToken();

      // Look for existing "Notes" folder - be more specific with search to avoid duplicates
      const response = await window.gapi.client.drive.files.list({
        q: "name='Notes' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents",
        fields: 'files(id,name,parents)'
      });

      if (response.result.files && response.result.files.length > 0) {
        // If multiple Notes folders exist, use the first one
        return response.result.files[0].id;
      }

      // Create Notes folder if it doesn't exist

      return await this.createFolder('Notes');
    } catch (error: any) {
      // Check if it's a 401 error and handle it
      if (error.status === 401) {
        await this.handleApiError(error);

        // Try once more with fresh authentication
        try {
          const signInSuccess = await this.signIn();
          if (signInSuccess) {
            await this.setAccessToken();

            const retryResponse = await window.gapi.client.drive.files.list({
              q: "name='Notes' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents",
              fields: 'files(id,name,parents)'
            });

            if (retryResponse.result.files && retryResponse.result.files.length > 0) {
              return retryResponse.result.files[0].id;
            }

            return await this.createFolder('Notes');
          }
        } catch (retryError) {
          throw retryError;
        }
      }

      throw error;
    }
  }

  async findOrCreateLoveFolder(): Promise<string> {
    try {
      await this.ensureApiLoaded();
      await this.setAccessToken();

      // Look for existing "Love" folder
      const response = await window.gapi.client.drive.files.list({
        q: "name='Love' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents",
        fields: 'files(id,name,parents)'
      });

      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
      }

      // Create Love folder if it doesn't exist
      return await this.createFolder('Love');
    } catch (error: any) {
      // Check if it's a 401 error and handle it
      if (error.status === 401) {
        await this.handleApiError(error);

        // Try once more with fresh authentication
        try {
          const signInSuccess = await this.signIn();
          if (signInSuccess) {
            await this.setAccessToken();

            const retryResponse = await window.gapi.client.drive.files.list({
              q: "name='Love' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents",
              fields: 'files(id,name,parents)'
            });

            if (retryResponse.result.files && retryResponse.result.files.length > 0) {
              return retryResponse.result.files[0].id;
            }

            return await this.createFolder('Love');
          }
        } catch (retryError) {
          throw retryError;
        }
      }

      throw error;
    }
  }

  async findOrCreateImagesFolder(): Promise<string> {
    try {
      await this.ensureApiLoaded();
      await this.setAccessToken();

      // First, get the Notes folder ID
      const notesFolderId = await this.findOrCreateNotesFolder();

      // Look for existing "Images" folder inside Notes folder
      const response = await window.gapi.client.drive.files.list({
        q: `name='Images' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${notesFolderId}' in parents`,
        fields: 'files(id,name,parents)'
      });

      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
      }

      // Create Images folder inside Notes folder if it doesn't exist
      return await this.createFolder('Images', notesFolderId);
    } catch (error: any) {
      // Check if it's a 401 error and handle it
      if (error.status === 401) {
        await this.handleApiError(error);

        // Try once more with fresh authentication
        try {
          const signInSuccess = await this.signIn();
          if (signInSuccess) {
            await this.setAccessToken();

            const notesFolderId = await this.findOrCreateNotesFolder();

            const retryResponse = await window.gapi.client.drive.files.list({
              q: `name='Images' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${notesFolderId}' in parents`,
              fields: 'files(id,name,parents)'
            });

            if (retryResponse.result.files && retryResponse.result.files.length > 0) {
              return retryResponse.result.files[0].id;
            }

            return await this.createFolder('Images', notesFolderId);
          }
        } catch (retryError) {
          throw retryError;
        }
      }

      throw error;
    }
  }

  async getImagesFromImagesFolder(): Promise<DriveImage[]> {
    try {
      await this.ensureApiLoaded();
      await this.setAccessToken();

      const imagesFolderId = await this.findOrCreateImagesFolder();

      const response = await window.gapi.client.drive.files.list({
        q: `'${imagesFolderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'image')`,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webContentLink)',
        orderBy: 'modifiedTime desc'
      });

      if (response.result.files) {
        // Process each image to ensure it's publicly accessible
        const processedImages = await Promise.all(
          response.result.files.map(async (file: any) => {
            try {
              // Make sure the image is publicly accessible
              await this.makeImagePublic(file.id);

              return {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: parseInt(file.size || '0'),
                createdTime: file.createdTime,
                modifiedTime: file.modifiedTime,
                thumbnailLink: file.thumbnailLink,
                webContentLink: file.webContentLink
              };
            } catch (error) {
              console.error(`Failed to process image ${file.name}:`, error);
              return null;
            }
          })
        );

        return processedImages.filter(img => img !== null) as DriveImage[];
      }

      return [];
    } catch (error: any) {
      console.error('Failed to get images from Images folder:', error);
      return [];
    }
  }

  private async makeImagePublic(fileId: string): Promise<void> {
    try {
      // Make the image publicly accessible
      await window.gapi.client.request({
        path: `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'anyone',
          role: 'reader'
        })
      });
    } catch (error) {
      console.error('Failed to make image public:', error);
      // Don't throw error, just log it
    }
  }

  async uploadImage(name: string, imageFile: File, parentId?: string): Promise<string> {
    await this.ensureApiLoaded();
    await this.setAccessToken();

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
      'name': name,
      'parents': parentId ? [parentId] : undefined,
    };

    // Convert File to base64
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/xxx;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${imageFile.type}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      close_delim;

    const request = window.gapi.client.request({
      'path': 'https://www.googleapis.com/upload/drive/v3/files',
      'method': 'POST',
      'params': { 'uploadType': 'multipart' },
      'headers': {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      'body': multipartRequestBody
    });

    const response = await request;
    const fileId = response.result.id;

    // Make the image publicly accessible for direct viewing
    try {
      await window.gapi.client.request({
        'path': `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        'method': 'POST',
        'headers': {
          'Content-Type': 'application/json'
        },
        'body': JSON.stringify({
          'type': 'anyone',
          'role': 'reader'
        })
      });
    } catch (error) {
      // Failed to make image public, but upload succeeded
    }

    return fileId;
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken) {
      const isValid = await this.validateAndRefreshToken();
      if (!isValid) {
        return null;
      }
    }
    return this.accessToken;
  }
}

export { GoogleDriveService };
export const driveService = new GoogleDriveService();

