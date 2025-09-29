

interface GoogleClient {
  init: (config: { discoveryDocs: string[] }) => Promise<void>;
  setToken: (token: { access_token: string }) => void;
  request: (config: {
    path: string;
    method: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    body?: string;
  }) => Promise<{ result: { id: string }; body: string }>;
  drive: {
    files: {
      create: (config: { resource: Record<string, unknown> }) => Promise<{ result: { id: string } }>;
      get: (config: { fileId: string; alt?: string }) => Promise<{ body: string }>;
      delete: (config: { fileId: string }) => Promise<void>;
      list: (config: { q?: string; fields?: string; orderBy?: string }) => Promise<{ result: { files?: DriveFile[] } }>;
    };
  };
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

// Notification types
export interface NotificationData {
  type: 'calendar' | 'note' | 'sync' | 'reminder' | 'general';
  id?: string;
  url?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface PushNotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: NotificationAction[];
  data?: NotificationData;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  calendarEvents: boolean;
  noteUpdates: boolean;
  syncStatus: boolean;
  reminders: boolean;
  pushNotifications: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: GoogleClient;
    };
    __ANRYE_SW_RESET__?: () => Promise<void>;
  }
}

export {};
