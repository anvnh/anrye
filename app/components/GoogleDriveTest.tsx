'use client';

import { useState, useEffect } from 'react';
import { driveService } from '../lib/googleDrive';

export default function GoogleDriveTest() {
  const [tokenStatus, setTokenStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTokenStatus = () => {
      try {
        const status = driveService.getTokenStatus();
        setTokenStatus(status);
      } catch (error) {
        console.error('Error getting token status:', error);
        setTokenStatus({ error: 'Failed to get token status' });
      }
      setIsLoading(false);
    };

    checkTokenStatus();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading token status...</div>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Google Drive Token Status</h3>
      
      {tokenStatus?.error ? (
        <div className="text-red-400">{tokenStatus.error}</div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Access Token:</span>
            <span className={tokenStatus?.hasAccessToken ? 'text-green-400' : 'text-red-400'}>
              {tokenStatus?.hasAccessToken ? 'Valid' : 'Missing/Expired'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-300">Refresh Token:</span>
            <span className={tokenStatus?.hasRefreshToken ? 'text-green-400' : 'text-red-400'}>
              {tokenStatus?.hasRefreshToken ? 'Valid' : 'Missing/Expired'}
            </span>
          </div>
          
          {tokenStatus?.accessTokenExpiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-300">Access Token Expires:</span>
              <span className="text-gray-400">{tokenStatus.accessTokenExpiresAt}</span>
            </div>
          )}
          
          {tokenStatus?.timeUntilAccessExpiry && (
            <div className="flex justify-between">
              <span className="text-gray-300">Time Until Access Expiry:</span>
              <span className="text-gray-400">{tokenStatus.timeUntilAccessExpiry}</span>
            </div>
          )}
          
          {tokenStatus?.refreshTokenExpiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-300">Refresh Token Expires:</span>
              <span className="text-gray-400">{tokenStatus.refreshTokenExpiresAt}</span>
            </div>
          )}
          
          {tokenStatus?.timeUntilRefreshExpiry && (
            <div className="flex justify-between">
              <span className="text-gray-300">Time Until Refresh Expiry:</span>
              <span className="text-gray-400">{tokenStatus.timeUntilRefreshExpiry}</span>
            </div>
          )}
        </div>
      )}
      
      <button 
        onClick={() => {
          const status = driveService.getTokenStatus();
          setTokenStatus(status);
        }}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Refresh Status
      </button>
    </div>
  );
}