export type StorageProvider = 'google-drive' | 'r2-turso';

export interface StorageConfig {
  provider: StorageProvider;
  isConfigured: boolean;
  displayName: string;
  description: string;
  icon: string;
}

export interface GoogleDriveConfig extends StorageConfig {
  provider: 'google-drive';
  accessToken?: string;
  refreshToken?: string;
  isAuthenticated: boolean;
}

export interface R2TursoConfig extends StorageConfig {
  provider: 'r2-turso';
  r2Bucket?: string;
  r2Region?: string;
  tursoUrl?: string;
  tursoToken?: string;
  isConfigured: boolean;
}

export type StorageConfigUnion = GoogleDriveConfig | R2TursoConfig;

export interface StorageService {
  uploadImage(name: string, imageFile: File, parentId?: string): Promise<string>;
  deleteImage(fileId: string): Promise<void>;
  getImageUrl(fileId: string): string;
  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface StorageStatus {
  currentProvider: StorageProvider;
  isConnected: boolean;
  isLoading: boolean;
  error?: string;
}
