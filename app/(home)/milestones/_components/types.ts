export interface Milestone {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date string
  images: MilestoneImage[];
  driveFileId?: string; // Google Drive file ID for milestone data
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneImage {
  id: string;
  name: string;
  url?: string; // For display
  driveFileId?: string; // Google Drive file ID for the image
  size: number;
  type: string; // MIME type
}

export interface MilestoneFolder {
  id: string;
  name: string;
  driveFolderId?: string;
}
