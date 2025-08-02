'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, Plus, Upload, Calendar, Image, Trash2, Edit, Save, X } from 'lucide-react';
import { Milestone, MilestoneImage } from './_components/types';
import { MilestoneImageViewer } from './_components/MilestoneImageViewer';
import { driveService } from '@/app/lib/googleDrive';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [hasSyncedWithDrive, setHasSyncedWithDrive] = useState<boolean>(false);
  
  // Create/Edit milestone states
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    images: [] as File[]
  });

  // Delete confirmation dialog state
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedMilestones = localStorage.getItem('milestones-love');
    const savedHasSynced = localStorage.getItem('has-synced-love-drive');

    if (savedMilestones) {
      setMilestones(JSON.parse(savedMilestones));
    }
    // Don't create default milestone - leave empty if no data exists

    if (savedHasSynced) {
      setHasSyncedWithDrive(JSON.parse(savedHasSynced));
    }
  }, []);

  // Check sign-in status
  useEffect(() => {
    const checkSignInStatus = async () => {
      try {
        const signedIn = await driveService.isSignedIn();
        setIsSignedIn(signedIn);
        
        // Sync with Drive if signed in and haven't synced yet
        if (signedIn && !hasSyncedWithDrive) {
          syncWithDrive();
        }
      } catch (error) {
        console.error('Failed to check sign-in status:', error);
        setIsSignedIn(false);
      }
    };

    checkSignInStatus();
  }, [hasSyncedWithDrive]);

  // Save to localStorage whenever milestones change
  useEffect(() => {
    localStorage.setItem('milestones-love', JSON.stringify(milestones));
  }, [milestones]);

  useEffect(() => {
    localStorage.setItem('has-synced-love-drive', JSON.stringify(hasSyncedWithDrive));
  }, [hasSyncedWithDrive]);

  const syncWithDrive = useCallback(async () => {
    try {
      setIsLoading(true);
      setSyncProgress(10);
      
      // Find or create Love folder
      const loveFolderId = await driveService.findOrCreateLoveFolder();
      setSyncProgress(50);
      
      // Load existing milestones from Drive
      if (!hasSyncedWithDrive) {
        await loadFromDrive(loveFolderId);
        setHasSyncedWithDrive(true);
      }
      setSyncProgress(90);
      
      setHasSyncedWithDrive(true);
      setSyncProgress(100);
    } catch (error) {
      console.error('Failed to sync with Drive:', error);
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncProgress(0), 500);
    }
  }, [hasSyncedWithDrive]);

  const loadFromDrive = async (loveFolderId: string) => {
    try {
      const files = await driveService.listFiles(loveFolderId);
      
      for (const file of files) {
        if (file.name.endsWith('.json') && file.name.startsWith('milestone-')) {
          // Load milestone data
          const content = await driveService.getFile(file.id);
          const milestoneData = JSON.parse(content);
          
          // Check if milestone already exists
          setMilestones(prev => {
            const existing = prev.find(m => m.driveFileId === file.id);
            if (!existing) {
              return [...prev, { ...milestoneData, driveFileId: file.id }];
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Failed to load from Drive:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...imageFiles]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const saveMilestone = async () => {
    if (!formData.title.trim() || !formData.date) return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      const milestoneId = editingId || Date.now().toString();
      let uploadedImages: MilestoneImage[] = [];

      // Upload images to Drive if signed in
      if (isSignedIn && formData.images.length > 0) {
        setSyncProgress(30);
        const loveFolderId = await driveService.findOrCreateLoveFolder();
        
        for (let i = 0; i < formData.images.length; i++) {
          const image = formData.images[i];
          setSyncProgress(30 + (40 * (i + 1) / formData.images.length));
          
          const imageId = await driveService.uploadImage(
            `${milestoneId}-${image.name}`,
            image,
            loveFolderId
          );
          
          uploadedImages.push({
            id: Date.now().toString() + i,
            name: image.name,
            driveFileId: imageId,
            size: image.size,
            type: image.type
          });
        }
      }

      setSyncProgress(70);

      const milestoneData: Milestone = {
        id: milestoneId,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        images: uploadedImages,
        createdAt: editingId ? 
          milestones.find(m => m.id === editingId)?.createdAt || new Date().toISOString() :
          new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save milestone data to Drive if signed in
      if (isSignedIn) {
        setSyncProgress(80);
        const loveFolderId = await driveService.findOrCreateLoveFolder();
        const milestoneFileId = await driveService.uploadFile(
          `milestone-${milestoneId}.json`,
          JSON.stringify(milestoneData, null, 2),
          loveFolderId
        );
        milestoneData.driveFileId = milestoneFileId;
      }

      setSyncProgress(90);

      // Update local state
      if (editingId) {
        setMilestones(prev => prev.map(m => m.id === editingId ? milestoneData : m));
      } else {
        setMilestones(prev => [...prev, milestoneData]);
      }

      // Reset form
      setFormData({ title: '', description: '', date: '', images: [] });
      setIsCreating(false);
      setEditingId(null);
      setSyncProgress(100);

      setTimeout(() => setSyncProgress(0), 500);
    } catch (error) {
      console.error('Failed to save milestone:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 700);
    }
  };

  const editMilestone = (milestone: Milestone) => {
    setFormData({
      title: milestone.title,
      description: milestone.description,
      date: milestone.date,
      images: []
    });
    setEditingId(milestone.id);
    setIsCreating(true);
  };

  const deleteMilestone = async (milestoneId: string) => {
    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return;

    setMilestoneToDelete(milestone);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!milestoneToDelete) return;

    try {
      setIsLoading(true);
      setSyncProgress(10);

      // Delete from Drive if signed in
      if (isSignedIn && milestoneToDelete.driveFileId) {
        setSyncProgress(30);
        await driveService.deleteFile(milestoneToDelete.driveFileId);
        
        // Delete associated images
        for (const image of milestoneToDelete.images) {
          if (image.driveFileId) {
            await driveService.deleteFile(image.driveFileId);
          }
        }
        setSyncProgress(80);
      }

      // Remove from local state
      setMilestones(prev => prev.filter(m => m.id !== milestoneToDelete?.id));
      setSyncProgress(100);

      setTimeout(() => setSyncProgress(0), 500);
    } catch (error) {
      console.error('Failed to delete milestone:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 700);
    }
    setIsDeleteDialogOpen(false);
    setMilestoneToDelete(null);
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setMilestoneToDelete(null);
  };

  const cancelEdit = () => {
    setFormData({ title: '', description: '', date: '', images: [] });
    setIsCreating(false);
    setEditingId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Sort milestones by date (newest first)
  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-main">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Heart className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-white">Love Milestones</h1>
          </div>
          
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            New Milestone
          </button>
        </div>

        {/* Sync Status */}
        {isLoading && (
          <div className="mb-6 bg-black/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">
                Syncing...
              </span>
              <span className="text-gray-400">{syncProgress}%</span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="mb-8 bg-black/20 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              {editingId ? 'Edit Milestone' : 'Create New Milestone'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter milestone title..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this special moment..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Images
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors">
                    <Upload size={16} />
                    Upload Images
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                  <span className="text-sm text-gray-400">
                    {formData.images.length} image(s) selected
                  </span>
                </div>
                
                {formData.images.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.images.map((image, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-800 rounded-lg p-2">
                        <span className="text-sm text-gray-300">{image.name}</span>
                        <button
                          onClick={() => removeImage(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveMilestone}
                  disabled={!formData.title.trim() || !formData.date || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Save size={16} />
                  {editingId ? 'Update' : 'Save'} Milestone
                </button>
                
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestones List */}
        <div className="space-y-6">
          {sortedMilestones.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="mx-auto text-primary/50 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                No milestones yet
              </h3>
              <p className="text-gray-400">
                Create your first milestone to start documenting your love story
              </p>
            </div>
          ) : (
            sortedMilestones.map((milestone) => (
              <div key={milestone.id} className="bg-black/20 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {milestone.title}
                    </h3>
                    <div className="flex items-center gap-2 text-primary">
                      <Calendar size={16} />
                      <span>{formatDate(milestone.date)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editMilestone(milestone)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteMilestone(milestone.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {milestone.description && (
                  <p className="text-gray-300 mb-4">
                    {milestone.description}
                  </p>
                )}

                {milestone.images.length > 0 && (
                  <MilestoneImageViewer 
                    images={milestone.images}
                    isEditing={false}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className='bg-main text-white border-none shadow-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-gray-300'>
              This will delete the milestone and all associated images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete} className='text-black hover:bg-gray-200 cursor-pointer'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className='text-white hover:bg-red-500 cursor-pointer'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
