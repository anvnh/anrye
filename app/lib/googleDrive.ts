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
  refresh_expires_at?: number; // Refresh token expiry (much longer)
}

interface GoogleAuth {
  access_token: string;
  refresh_token?: string;
  error?: string;
  expires_in?: number;
}

interface GoogleTokenClient {
  callback?: (response: GoogleAuth) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
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

  private saveToken(accessToken: string, expiresIn?: number, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    
    // Use provided expiry time or default to 1 hour
    const expiryDuration = expiresIn ? (expiresIn * 1000) : (3600 * 1000); // Convert to milliseconds
    const expiresAt = Date.now() + expiryDuration;
    
    // Refresh token typically expires in 6 months, but we'll be conservative
    const refreshExpiresAt = refreshToken ? Date.now() + (30 * 24 * 60 * 60 * 1000) : undefined; // 30 days
    
    const tokenData: TokenData = {
      access_token: accessToken,
      expires_at: expiresAt,
      ...(refreshToken && { 
        refresh_token: refreshToken,
        refresh_expires_at: refreshExpiresAt 
      })
    };
    
    // If we have existing refresh token and no new one provided, keep the old one
    if (!refreshToken && this.refreshToken) {
      const existingToken = localStorage.getItem(this.TOKEN_KEY);
      if (existingToken) {
        try {
          const existing = JSON.parse(existingToken);
          if (existing.refresh_token) {
            tokenData.refresh_token = existing.refresh_token;
            tokenData.refresh_expires_at = existing.refresh_expires_at;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
  }

  private loadSavedToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const savedToken = localStorage.getItem(this.TOKEN_KEY);
      if (savedToken) {
        const tokenData: TokenData = JSON.parse(savedToken);
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
              console.log('Access token expired, but refresh token still valid');
            } else {
              // Both tokens expired
              localStorage.removeItem(this.TOKEN_KEY);
              this.accessToken = null;
              this.refreshToken = null;
            }
          } else {
            // No refresh token, clear everything
            localStorage.removeItem(this.TOKEN_KEY);
            this.accessToken = null;
            this.refreshToken = null;
          }
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

      // If token is still valid for more than 10 minutes, no refresh needed
      if (timeUntilExpiry > 10 * 60 * 1000) {
        return true;
      }
      
      // If token expires within 10 minutes but still valid, try to refresh
      if (timeUntilExpiry > 0) {
        console.log('Token expires soon, attempting refresh...');
        try {
          const refreshSuccess = await this.refreshWithRefreshToken();
          if (refreshSuccess) {
            return true;
          }
        } catch (error) {
          console.log('Refresh token failed, will require re-authentication');
        }
      }
      
      // Token expired, try refresh token if available
      if (!this.accessToken && this.refreshToken) {
        console.log('Access token expired, trying refresh token...');
        try {
          const refreshSuccess = await this.refreshWithRefreshToken();
          if (refreshSuccess) {
            return true;
          }
        } catch (error) {
          console.log('Refresh token failed:', error);
        }
      }
      
      // Token expired or refresh failed, clear everything
      this.clearSavedToken();
      this.accessToken = null;
      this.refreshToken = null;
      
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
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Refresh access token using refresh token
  private async refreshWithRefreshToken(): Promise<boolean> {
    if (!this.refreshToken) {
      console.log('No refresh token available');
      return false;
    }

    try {
      console.log('Using refresh token to get new access token...');
      
      // Use Google's token endpoint to refresh
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        console.error('Refresh token request failed:', response.status, response.statusText);
        return false;
      }

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        // Note: refresh token may or may not be returned - keep existing if not provided
        this.saveToken(data.access_token, data.expires_in, data.refresh_token);
        console.log('Token refreshed successfully using refresh token');
        return true;
      } else {
        console.error('No access token in refresh response:', data);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  // Silent refresh method (fallback)
  private async silentRefresh(): Promise<boolean> {
    if (!this.tokenClient) {
      return false;
    }

    return new Promise((resolve) => {
      // Save original callback
      const originalCallback = this.tokenClient?.callback;
      
      // Set up silent refresh callback
      if (this.tokenClient) {
        this.tokenClient.callback = (response: GoogleAuth) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.saveToken(response.access_token, response.expires_in, response.refresh_token);
            console.log('Silent token refresh successful');
            resolve(true);
          } else {
            console.log('Silent token refresh failed');
            resolve(false);
          }
          
          // Restore original callback
          if (this.tokenClient && originalCallback) {
            this.tokenClient.callback = originalCallback;
          }
        };
        
        // Request new token silently
        try {
          this.tokenClient.requestAccessToken({ prompt: '' });
        } catch (error) {
          console.log('Silent refresh request failed:', error);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    });
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
        // Request offline access to get refresh token
        access_type: 'offline',
        callback: (response: GoogleAuth) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            if (response.refresh_token) {
              this.refreshToken = response.refresh_token;
              console.log('✅ Refresh token received! You can stay logged in longer.');
            } else {
              console.log('⚠️ No refresh token received. User might need to re-authorize with consent.');
            }
            this.saveToken(response.access_token, response.expires_in, response.refresh_token);
            console.log('Received new tokens:', {
              access_token: '***',
              refresh_token: response.refresh_token ? '***' : 'none',
              expires_in: response.expires_in
            });
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
              if (response.refresh_token) {
                this.refreshToken = response.refresh_token;
              }
              this.saveToken(response.access_token, response.expires_in, response.refresh_token);
              console.log('Sign in successful, tokens received');
              resolve(true);
            } else {
              console.log('Sign in failed, no access token received');
              resolve(false);
            }
          };
          
          // Request access token with prompt to ensure refresh token
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
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
    this.refreshToken = null;
    this.clearSavedToken();
  }

  // Force clear all tokens and restart authentication
  public async forceReAuthenticate(): Promise<boolean> {
    console.log('Force re-authenticating with Google Drive...');
    // Clear everything
    if (this.accessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken);
      } catch (e) {
        // Silent fail
      }
    }
    
    this.accessToken = null;
    this.refreshToken = null;
    this.clearSavedToken();
    this.tokenClient = null;
    
    // Force fresh sign in
    return await this.signIn();
  }

  // Public method to manually refresh token
  public async refreshToken(): Promise<boolean> {
    console.log('Manually refreshing Google Drive token...');
    try {
      // Try refresh token first
      if (this.refreshToken) {
        const success = await this.refreshWithRefreshToken();
        if (success) {
          console.log('Token refresh successful using refresh token');
          return true;
        }
      }
      
      // Fallback to silent refresh
      const success = await this.silentRefresh();
      if (success) {
        console.log('Token refresh successful using silent refresh');
        return true;
      } else {
        console.log('Token refresh failed, attempting re-authentication');
        return await this.forceReAuthenticate();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
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
      
      // Look for existing "Notes" folder - be more specific with search to avoid duplicates
      const response = await window.gapi.client.drive.files.list({
        q: "name='Notes' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents",
        fields: 'files(id,name,parents)'
      });

      if (response.result.files && response.result.files.length > 0) {
        // If multiple Notes folders exist, use the first one and log a warning
        if (response.result.files.length > 1) {
          console.warn(`Found ${response.result.files.length} Notes folders. Using the first one.`);
        }
        return response.result.files[0].id;
      }

      // Create Notes folder if it doesn't exist
      console.log('Creating new Notes folder in Google Drive...');
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
}

export const driveService = new GoogleDriveService();

