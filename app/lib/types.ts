

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

declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: GoogleClient;
    };

  }
}

export {};
