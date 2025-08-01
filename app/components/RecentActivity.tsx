'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Heart, 
  Settings, 
  Edit, 
  Clock, 
  Calendar,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import ActivityService, { Activity } from '../lib/activityService';
import { useDrive } from '../lib/driveContext';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
};

const getActivityColor = (type: Activity['type']): string => {
  switch (type) {
    case 'note':
      return 'text-blue-400 bg-blue-400/10';
    case 'milestone':
      return 'text-pink-400 bg-pink-400/10';
    case 'utility':
      return 'text-green-400 bg-green-400/10';
    case 'editor':
      return 'text-purple-400 bg-purple-400/10';
    default:
      return 'text-gray-400 bg-gray-400/10';
  }
};

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'FileText':
      return <FileText className="w-5 h-5" />;
    case 'Heart':
      return <Heart className="w-5 h-5" />;
    case 'Settings':
      return <Settings className="w-5 h-5" />;
    case 'Edit':
      return <Edit className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { isSignedIn } = useDrive();
  const activityService = new ActivityService();

  const ITEMS_PER_PAGE = 3;
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentActivities = activities.slice(startIndex, endIndex);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const recentActivities = await activityService.getRecentActivities(9);
      setActivities(recentActivities);
      setCurrentPage(1); // Reset to first page when new data is loaded
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load recent activities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [isSignedIn]);

  const handleRefresh = () => {
    fetchActivities();
  };

  return (
    <div className="py-12 bg-secondary">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <h2 className="text-3xl font-bold text-white">
              Recent Activity
            </h2>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh activities"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {isSignedIn && (
            <div className="text-center mb-4">
              <span className="text-sm text-green-400">✓ Connected to Google Drive</span>
            </div>
          )}
          <p className="text-gray-400">
            {isSignedIn ? 'Your latest activities from Google Drive' : 'Connect to Google Drive to see your activities'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center space-x-3 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Loading activities...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-main text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">
              {isSignedIn ? 'No recent activities found' : 'Sign in to Google Drive to see your activities'}
            </p>
            {!isSignedIn && (
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-main text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span>Connect Google Drive</span>
              </Link>
            )}
          </div>
                ) : (
          <>
            <div className="space-y-4">
              {currentActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.href}
                  className="block group"
                >
                  <div className="rounded-lg p-4 bg-main hover:bg-gray-700 transition-all duration-200 border border-gray-600 hover:border-gray-500">
                    <div className="flex items-center space-x-4">
                      {/* Activity Icon */}
                      <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                        {getIconComponent(activity.icon)}
                      </div>

                      {/* Activity Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-medium truncate group-hover:text-primary transition-colors">
                            {activity.title}
                          </h3>
                          <div className="flex items-center space-x-2 text-gray-400 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>{getTimeAgo(activity.timestamp)}</span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm mt-1 truncate">
                          {activity.description}
                        </p>
                      </div>

                      {/* Arrow Icon */}
                      <div className="text-gray-400 group-hover:text-primary transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={`${
                          currentPage === 1 
                            ? 'pointer-events-none opacity-50 text-gray-500' 
                            : 'cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700'
                        } transition-colors`}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => setCurrentPage(page)}
                          className={`cursor-pointer transition-colors ${
                            currentPage === page
                              ? 'bg-main text-white border-gray-600 hover:bg-gray-700 hover:text-white'
                              : 'text-gray-300 hover:text-white hover:bg-gray-700 border-gray-600'
                          }`}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={`${
                          currentPage === totalPages 
                            ? 'pointer-events-none opacity-50 text-gray-500' 
                            : 'cursor-pointer text-gray-300 hover:text-white hover:bg-gray-700'
                        } transition-colors`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        {/* View All Activities Button */}
        <div className="text-center mt-8">
          <Link
            href="/activity"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-main text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            <span>View All Activities</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 