import { GoogleDriveService } from './googleDrive';

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
  private driveService: GoogleDriveService;

  constructor() {
    this.driveService = new GoogleDriveService();
  }

  async getRecentActivities(limit: number = 9): Promise<Activity[]> {
    try {
      const activities: Activity[] = [];
      
      // Check if user is signed in
      const isSignedIn = await this.driveService.isSignedIn();
      console.log('🔍 ActivityService: isSignedIn =', isSignedIn);
      
      if (!isSignedIn) {
        console.log('🔍 ActivityService: User not signed in, returning mock data');
        return this.getMockActivities();
      }

      // Get files from different folders
      const [notesFiles, loveFiles, utilsFiles, allFiles] = await Promise.allSettled([
        this.getNotesFiles(),
        this.getLoveFiles(),
        this.getUtilsFiles(),
        this.getAllRecentFiles()
      ]);

      console.log('🔍 ActivityService: Notes files found:', notesFiles.status === 'fulfilled' ? notesFiles.value.length : 'failed');
      console.log('🔍 ActivityService: Love files found:', loveFiles.status === 'fulfilled' ? loveFiles.value.length : 'failed');
      console.log('🔍 ActivityService: Utils files found:', utilsFiles.status === 'fulfilled' ? utilsFiles.value.length : 'failed');
      console.log('🔍 ActivityService: All recent files found:', allFiles.status === 'fulfilled' ? allFiles.value.length : 'failed');

      // Process notes files
      if (notesFiles.status === 'fulfilled') {
        const noteActivities = notesFiles.value.map(file => this.convertFileToActivity(file, 'note'));
        activities.push(...noteActivities);
        console.log('🔍 ActivityService: Added', noteActivities.length, 'note activities');
      }

      // Process love files (milestones)
      if (loveFiles.status === 'fulfilled') {
        const loveActivities = loveFiles.value.map(file => this.convertFileToActivity(file, 'milestone'));
        activities.push(...loveActivities);
        console.log('🔍 ActivityService: Added', loveActivities.length, 'love activities');
      }

      // Process utils files
      if (utilsFiles.status === 'fulfilled') {
        const utilsActivities = utilsFiles.value.map(file => this.convertFileToActivity(file, 'utility'));
        activities.push(...utilsActivities);
        console.log('🔍 ActivityService: Added', utilsActivities.length, 'utils activities');
      }

      // Process all recent files (fallback)
      if (allFiles.status === 'fulfilled' && activities.length === 0) {
        const recentActivities = allFiles.value.map(file => this.convertFileToActivity(file, 'note'));
        activities.push(...recentActivities);
        console.log('🔍 ActivityService: Added', recentActivities.length, 'recent activities as fallback');
      }

      // Sort by modified time (most recent first) and limit
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log('🔍 ActivityService: Total activities found:', activities.length);
      console.log('🔍 ActivityService: Activities:', activities.map(a => ({ title: a.title, type: a.type, timestamp: a.timestamp })));
      
      return activities.slice(0, limit);
    } catch (error) {
      console.error('❌ ActivityService: Error fetching recent activities:', error);
      return this.getMockActivities();
    }
  }

  private async getNotesFiles(): Promise<DriveActivity[]> {
    try {
      const notesFolderId = await this.driveService.findOrCreateNotesFolder();
      console.log('🔍 ActivityService: Notes folder ID:', notesFolderId);
      
      const files = await this.driveService.listFiles(notesFolderId);
      console.log('🔍 ActivityService: All files in Notes folder:', files.map(f => ({ name: f.name, mimeType: f.mimeType })));
      
      // More permissive filter - include all text-based files
      const filteredFiles = files.filter(file => 
        file.mimeType === 'text/plain' || 
        file.mimeType.includes('document') ||
        file.mimeType.includes('text') ||
        file.mimeType.includes('application/vnd.google-apps')
      );
      
      console.log('🔍 ActivityService: Filtered notes files:', filteredFiles.map(f => ({ name: f.name, mimeType: f.mimeType })));
      
      return filteredFiles;
    } catch (error) {
      console.error('❌ ActivityService: Error fetching notes files:', error);
      return [];
    }
  }

  private async getLoveFiles(): Promise<DriveActivity[]> {
    try {
      const loveFolderId = await this.driveService.findOrCreateLoveFolder();
      const files = await this.driveService.listFiles(loveFolderId);
      return files.filter(file => file.mimeType === 'text/plain' || file.mimeType.includes('document'));
    } catch (error) {
      console.error('Error fetching love files:', error);
      return [];
    }
  }

  private async getUtilsFiles(): Promise<DriveActivity[]> {
    try {
      // Look for utils folder or files with utils prefix
      const allFiles = await this.driveService.listFiles();
      return allFiles.filter(file => 
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
      // Get all files and sort by modified time
      const allFiles = await this.driveService.listFiles();
      console.log('🔍 ActivityService: All files in Drive:', allFiles.map(f => ({ name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime })));
      
      // Filter for text-based files and sort by modified time
      const textFiles = allFiles.filter(file => 
        file.mimeType === 'text/plain' || 
        file.mimeType.includes('document') ||
        file.mimeType.includes('text') ||
        file.mimeType.includes('application/vnd.google-apps')
      );
      
      // Sort by modified time (most recent first) and take top 10
      textFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
      
      console.log('🔍 ActivityService: Recent text files:', textFiles.slice(0, 5).map(f => ({ name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime })));
      
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