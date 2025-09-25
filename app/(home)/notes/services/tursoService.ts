interface TursoConfig {
  url: string;
  token: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

class TursoService {
  private config: TursoConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('turso-config');
      if (stored) {
        this.config = JSON.parse(stored);
      }
    }
  }

  private async executeQuery(query: string, params: any[] = []): Promise<any> {
    // Always refresh config from localStorage in case settings changed
    this.loadConfig();

    if (!this.config) {
      throw new Error('Turso configuration not found');
    }

    const response = await fetch('/api/storage/turso/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Turso-URL': this.config.url,
        'X-Turso-Token': this.config.token,
      },
      body: JSON.stringify({ query, params }),
    });

    if (!response.ok) {
      throw new Error(`Turso query failed: ${response.statusText}`);
    }

    return response.json();
  }

  async initializeDatabase(): Promise<void> {
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        folder_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
    `;

    await this.executeQuery(createTablesQuery);
  }

  async saveNote(note: Omit<Note, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const query = `
      INSERT OR REPLACE INTO notes (id, title, content, folder_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.executeQuery(query, [
      note.id,
      note.title,
      note.content,
      note.folderId || null,
      now,
      now,
    ]);
  }

  async getNote(id: string): Promise<Note | null> {
    const query = 'SELECT * FROM notes WHERE id = ?';
    const result = await this.executeQuery(query, [id]);
    
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        content: row.content,
        folderId: row.folder_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    
    return null;
  }

  async getAllNotes(): Promise<Note[]> {
    const query = 'SELECT * FROM notes ORDER BY updated_at DESC';
    const result = await this.executeQuery(query);
    
    if (result.rows) {
      return result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        folderId: row.folder_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
    
    return [];
  }

  async deleteNote(id: string): Promise<void> {
    const query = 'DELETE FROM notes WHERE id = ?';
    await this.executeQuery(query, [id]);
  }

  async saveFolder(folder: Omit<Folder, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    const query = `
      INSERT OR REPLACE INTO folders (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.executeQuery(query, [
      folder.id,
      folder.name,
      folder.parentId || null,
      now,
      now,
    ]);
  }

  async getAllFolders(): Promise<Folder[]> {
    const query = 'SELECT * FROM folders ORDER BY name ASC';
    const result = await this.executeQuery(query);
    
    if (result.rows) {
      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
    
    return [];
  }

  async deleteFolder(id: string): Promise<void> {
    // First delete all notes in this folder
    await this.executeQuery('DELETE FROM notes WHERE folder_id = ?', [id]);
    
    // Then delete the folder
    const query = 'DELETE FROM folders WHERE id = ?';
    await this.executeQuery(query, [id]);
  }

  async isConnected(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      // Test connection by running a simple query
      await this.executeQuery('SELECT 1');
      return true;
    } catch (error) {
      console.error('Turso connection test failed:', error);
      return false;
    }
  }

  async connect(): Promise<void> {
    await this.ensureConfigured();
    await this.initializeDatabase();
  }

  async disconnect(): Promise<void> {
    this.config = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('turso-config');
    }
  }

  private async ensureConfigured(): Promise<void> {
    if (!this.config) {
      throw new Error('Turso is not configured. Please set up your Turso credentials in settings.');
    }

    if (!this.config.url || !this.config.token) {
      throw new Error('Turso configuration is incomplete. Please check your settings.');
    }
  }
}

export const tursoService = new TursoService();
