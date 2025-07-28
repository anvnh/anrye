import './types';
import { getGoogleClientId, isGoogleClientIdConfigured } from './env';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

interface GoogleAuth {
  access_token: string;
  error?: string;
  expires_in?: number;
}

interface GoogleTokenClient {
  callback?: (response: GoogleAuth) => void;
  requestAccessToken: () => void;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenClient: GoogleTokenClient | null = null;
  private readonly TOKEN_KEY = 'google_drive_token';
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

  private saveToken(accessToken: string): void {
    if (typeof window === 'undefined') return;
    
    const expiresAt = Date.now() + (3600 * 1000); // 1 hour from now (Google tokens typically expire in 1 hour)
    const tokenData: TokenData = {
      access_token: accessToken,
      expires_at: expiresAt
    };
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
  }

  private loadSavedToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const savedToken = localStorage.getItem(this.TOKEN_KEY);
      if (savedToken) {
        const tokenData: TokenData = JSON.parse(savedToken);
        const timeUntilExpiry = tokenData.expires_at - Date.now();
        
        if (timeUntilExpiry > 5 * 60 * 1000) { // At least 5 minutes left
          this.accessToken = tokenData.access_token;
        } else if (timeUntilExpiry > 0) {
          this.accessToken = tokenData.access_token;
        } else {
          localStorage.removeItem(this.TOKEN_KEY);
        }
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.TOKEN_KEY);
      }
    }
  }

  private async validateAndRefreshToken(): Promise<boolean> {
    if (!this.accessToken || this.isRefreshing) {
      return false;
    }

    // Check if refresh is already in progress
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    try {
      const savedToken = localStorage.getItem(this.TOKEN_KEY);
      if (!savedToken) {
        return false;
      }

      const tokenData: TokenData = JSON.parse(savedToken);
      const timeUntilExpiry = tokenData.expires_at - Date.now();

      // If token is still valid for more than 5 minutes, no refresh needed
      if (timeUntilExpiry > 5 * 60 * 1000) {
        return true;
      }
      
      // For now, clear the token and let the user re-authenticate
      // In a full implementation, we would use a refresh token here
      this.clearSavedToken();
      this.accessToken = null;
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<Response> {
    const maxRetries = 1;
    
    // Check token validity before making request
    const isTokenValid = await this.validateAndRefreshToken();
    if (!isTokenValid || !this.accessToken) {
      if (retryCount === 0) {
        const signInSuccess = await this.signIn();
        if (signInSuccess && retryCount < maxRetries) {
          return this.makeAuthenticatedRequest(url, options, retryCount + 1);
        }
      }
      throw new Error('Unable to authenticate with Google Drive');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    // If we get a 401 (unauthorized), try to re-authenticate once
    if (response.status === 401 && retryCount < maxRetries) {
      this.clearSavedToken();
      this.accessToken = null;
      
      const signInSuccess = await this.signIn();
      if (signInSuccess) {
        return this.makeAuthenticatedRequest(url, options, retryCount + 1);
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
    }
  }

  async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      
      if (window.gapi && this.tokenClient) {
        resolve();
        return;
      }

      // Load Google API script first
      const loadGapi = () => {
        return new Promise<void>((gapiResolve, gapiReject) => {
          if (window.gapi) {
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

      // Load Google Identity Services script
      const loadGSI = () => {
        return new Promise<void>((gsiResolve, gsiReject) => {
          if (document.querySelector('script[src*="accounts.google.com"]')) {
            gsiResolve();
            return;
          }

          const gsiScript = document.createElement('script');
          gsiScript.src = 'https://accounts.google.com/gsi/client';
          gsiScript.async = true;
          gsiScript.defer = true;
          gsiScript.onload = () => {
            gsiResolve();
          };
          gsiScript.onerror = () => {
            gsiReject(new Error('Failed to load Google Identity Services'));
          };
          document.head.appendChild(gsiScript);
        });
      };

      // Load both and then setup token client
      Promise.all([loadGapi(), loadGSI()])
        .then(() => {
          // Wait a bit for GSI to be ready
          setTimeout(() => {
            this.setupTokenClient();
            resolve();
          }, 100);
        })
        .catch(reject);
    });
  }

  private setupTokenClient(): void {
    const clientId = getGoogleClientId();
    
    if (!clientId) {
      return;
    }
    
    if (window.google?.accounts?.oauth2) {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: GoogleAuth) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.saveToken(response.access_token);
          }
        },
      });
    }
  }

  async signIn(): Promise<boolean> {
    try {
      // Check if we already have a valid token
      if (this.accessToken) {
        return true;
      }

      // Check if Google Client ID is configured
      if (!isGoogleClientIdConfigured()) {
        alert('Google Drive integration is not configured. Please check the console for details.');
        return false;
      }

      await this.loadGoogleAPI();
      
      if (!this.tokenClient) {
        return false;
      }

      return new Promise((resolve) => {
        // Update callback to resolve promise
        if (this.tokenClient) {
          this.tokenClient.callback = (response: GoogleAuth) => {
            if (response.access_token) {
              this.accessToken = response.access_token;
              this.saveToken(response.access_token);
              resolve(true);
            } else {
              resolve(false);
            }
          };
          
          // Request access token
          this.tokenClient.requestAccessToken();
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      return false;
    }
  }

  async signOut(): Promise<void> {
    if (this.accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(this.accessToken);
    }
    this.accessToken = null;
    this.clearSavedToken();
  }

  // Force clear all tokens and restart authentication
  public async forceReAuthenticate(): Promise<boolean> {
    // Clear everything
    if (this.accessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken);
      } catch (e) {
        // Silent fail
      }
    }
    
    this.accessToken = null;
    this.clearSavedToken();
    this.tokenClient = null;
    
    // Force fresh sign in
    return await this.signIn();
  }

  async isSignedIn(): Promise<boolean> {
    return this.accessToken !== null;
  }

  private async setAccessToken(): Promise<void> {
    try {
      // Validate token before using it
      const isTokenValid = await this.validateAndRefreshToken();
      
      if (!isTokenValid || !this.accessToken) {
        const signInSuccess = await this.signIn();
        if (!signInSuccess) {
          throw new Error('Unable to authenticate with Google Drive');
        }
      }

      if (this.accessToken && typeof window !== 'undefined' && window.gapi?.client) {
        window.gapi.client.setToken({
          access_token: this.accessToken
        });
      }
    } catch (error) {
      throw error;
    }
  }

  private async ensureApiLoaded(): Promise<void> {
    if (!window.gapi?.client) {
      await this.loadGoogleAPI();
    }
  }

  private async handleApiError(error: { status?: number }): Promise<boolean> {
    // Check if error is due to invalid/expired token
    if (error.status === 401 || error.status === 403) {
      this.clearSavedToken();
      this.accessToken = null;
      
      // Also revoke the token if possible
      if (window.google?.accounts?.oauth2 && this.accessToken) {
        try {
          window.google.accounts.oauth2.revoke(this.accessToken);
        } catch (e) {
          // Silent fail
        }
      }
      
      return true; // Indicates token needs refresh
    }
    return false;
  }

  private async makeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error: unknown) {
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
      'params': {'uploadType': 'multipart'},
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
      
      // Look for existing "Notes" folder
      const response = await window.gapi.client.drive.files.list({
        q: "name='Notes' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id,name)'
      });

      if (response.result.files && response.result.files.length > 0) {
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
              q: "name='Notes' and mimeType='application/vnd.google-apps.folder' and trashed=false",
              fields: 'files(id,name)'
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
}

export const driveService = new GoogleDriveService();
