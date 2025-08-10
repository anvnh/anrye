// Lazily import GoogleDriveService to keep it out of the initial bundle
let driveModulePromise: Promise<typeof import('./googleDrive')> | null = null;
const loadDrive = () => {
  if (!driveModulePromise) {
    driveModulePromise = import('./googleDrive');
  }
  return driveModulePromise;
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime: string;
  modifiedTime: string;
}

export interface Activity {
  id: string;
  type: 'note' | 'milestone' | 'utility' | 'editor';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  href: string;
  fileId?: string;
}

export interface DriveActivity {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

class ActivityService {
  private driveService: any | null = null;

  private async ensureDrive() {
    if (!this.driveService) {
      const mod = await loadDrive();
      // Prefer the singleton if available, fallback to class constructor
      this.driveService = mod.driveService ?? new mod.GoogleDriveService();
    }
    return this.driveService;
  }

  async getRecentActivities(limit: number = 9): Promise<Activity[]> {
    try {
      const activities: Activity[] = [];
      // Cheap pre-check: avoid importing Drive if no token
      const tokenRaw = typeof window !== 'undefined' ? window.localStorage.getItem('google_drive_token') : null;
      if (!tokenRaw) {
        return this.getMockActivities();
      }

      const drive = await this.ensureDrive();
      // Check if user is signed in
      const isSignedIn = await drive.isSignedIn();
      
      if (!isSignedIn) {
        return this.getMockActivities();
      }

      // Get files from different folders
      const [notesFiles, loveFiles, utilsFiles, allFiles] = await Promise.allSettled([
        this.getNotesFiles(),
        this.getLoveFiles(),
        this.getUtilsFiles(),
        this.getAllRecentFiles()
      ]);

      // Process notes files
      if (notesFiles.status === 'fulfilled') {
        const noteActivities = notesFiles.value.map(file => this.convertFileToActivity(file, 'note'));
        activities.push(...noteActivities);
      }

      // Process love files (milestones)
      if (loveFiles.status === 'fulfilled') {
        const loveActivities = loveFiles.value.map(file => this.convertFileToActivity(file, 'milestone'));
        activities.push(...loveActivities);
      }

      // Process utils files
      if (utilsFiles.status === 'fulfilled') {
        const utilsActivities = utilsFiles.value.map(file => this.convertFileToActivity(file, 'utility'));
        activities.push(...utilsActivities);
      }

      // Process all recent files (fallback)
      if (allFiles.status === 'fulfilled' && activities.length === 0) {
        const recentActivities = allFiles.value.map(file => this.convertFileToActivity(file, 'note'));
        activities.push(...recentActivities);
      }

      // Sort by modified time (most recent first) and limit
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return activities.slice(0, limit);
    } catch (error) {
      console.error('❌ ActivityService: Error fetching recent activities:', error);
      return this.getMockActivities();
    }
  }

  private async getNotesFiles(): Promise<DriveActivity[]> {
    try {
      const drive = await this.ensureDrive();
      const notesFolderId = await drive.findOrCreateNotesFolder();
      
      const files = await drive.listFiles(notesFolderId);
      
      // More permissive filter - include all text-based files
      const filteredFiles = files.filter((file: DriveFile) => 
        file.mimeType === 'text/plain' || 
        file.mimeType.includes('document') ||
        file.mimeType.includes('text') ||
        file.mimeType.includes('application/vnd.google-apps')
      );
      
      return filteredFiles;
    } catch (error) {
      console.error('❌ ActivityService: Error fetching notes files:', error);
      return [];
    }
  }

  private async getLoveFiles(): Promise<DriveActivity[]> {
    try {
      const drive = await this.ensureDrive();
      const loveFolderId = await drive.findOrCreateLoveFolder();
      const files = await drive.listFiles(loveFolderId);
      return files.filter((file: DriveFile) => file.mimeType === 'text/plain' || file.mimeType.includes('document'));
    } catch (error) {
      console.error('Error fetching love files:', error);
      return [];
    }
  }

  private async getUtilsFiles(): Promise<DriveActivity[]> {
    try {
      const drive = await this.ensureDrive();
      // Look for utils folder or files with utils prefix
      const allFiles = await drive.listFiles();
      return allFiles.filter((file: DriveFile) => 
        file.name.toLowerCase().includes('utils') || 
        file.name.toLowerCase().includes('utility') ||
        file.name.toLowerCase().includes('tool')
      );
    } catch (error) {
      console.error('❌ ActivityService: Error fetching utils files:', error);
      return [];
    }
  }

  private async getAllRecentFiles(): Promise<DriveActivity[]> {
    try {
      const drive = await this.ensureDrive();
      // Get all files and sort by modified time
      const allFiles = await drive.listFiles();
      
      // Filter for text-based files and sort by modified time
      const textFiles = allFiles.filter((file: DriveFile) => 
        file.mimeType === 'text/plain' || 
        file.mimeType.includes('document') ||
        file.mimeType.includes('text') ||
        file.mimeType.includes('application/vnd.google-apps')
      );
      
      // Sort by modified time (most recent first) and take top 10
      textFiles.sort((a: DriveFile, b: DriveFile) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
      
      return textFiles.slice(0, 10);
    } catch (error) {
      console.error('❌ ActivityService: Error fetching all recent files:', error);
      return [];
    }
  }

  private convertFileToActivity(file: DriveActivity, type: Activity['type']): Activity {
    const getIconType = (type: Activity['type']): string => {
      switch (type) {
        case 'note':
          return 'FileText';
        case 'milestone':
          return 'Heart';
        case 'utility':
          return 'Settings';
        case 'editor':
          return 'Edit';
        default:
          return 'FileText';
      }
    };

    const getHref = (type: Activity['type']) => {
      switch (type) {
        case 'note':
          return '/notes';
        case 'milestone':
          return '/milestones';
        case 'utility':
          return '/utils';
        case 'editor':
          return '/editor';
        default:
          return '/notes';
      }
    };

    const getDescription = (type: Activity['type'], name: string) => {
      switch (type) {
        case 'note':
          return `Updated: ${name}`;
        case 'milestone':
          return `Love milestone: ${name}`;
        case 'utility':
          return `Used utility: ${name}`;
        case 'editor':
          return `Created: ${name}`;
        default:
          return `Modified: ${name}`;
      }
    };

    return {
      id: file.id,
      type,
      title: file.name,
      description: getDescription(type, file.name),
      timestamp: new Date(file.modifiedTime),
      icon: getIconType(type),
      href: getHref(type),
      fileId: file.id
    };
  }

  private getMockActivities(): Activity[] {
    return [
      {
        id: '1',
        type: 'note',
        title: 'Meeting Notes',
        description: 'Updated meeting notes for project discussion',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        icon: 'FileText',
        href: '/notes'
      },
      {
        id: '2',
        type: 'milestone',
        title: 'Love Anniversary',
        description: 'Celebrated 100 days together!',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        icon: 'Heart',
        href: '/milestones'
      },
      {
        id: '3',
        type: 'utility',
        title: 'Password Generator',
        description: 'Generated new secure password',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        icon: 'Settings',
        href: '/utils'
      },
      {
        id: '4',
        type: 'editor',
        title: 'Code Snippet',
        description: 'Created new React component',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        icon: 'Edit',
        href: '/editor'
      }
    ];
  }
}

export default ActivityService; 