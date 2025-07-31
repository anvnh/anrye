'use client';

import { useState } from 'react';
import { useDrive } from '../lib/driveContext';

export default function GoogleDriveTest() {
  const { getTokenStatus, refreshToken, isSignedIn } = useDrive();
  const [showTokenStatus, setShowTokenStatus] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<any>(null);

  const testGoogleDrive = () => {
    console.log('=== Google Drive Environment Test ===');
    console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Client ID configured?', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('❌ Google Client ID not found! Check environment variables.');
    } else {
      alert(`✅ Google Client ID found: ${clientId.substring(0, 20)}...`);
    }
  };

  const checkTokenStatus = () => {
    const status = getTokenStatus();
    setTokenStatus(status);
    setShowTokenStatus(!showTokenStatus);
  };

  const handleRefreshToken = async () => {
    await refreshToken();
    // Update status after refresh
    const status = getTokenStatus();
    setTokenStatus(status);
  };

  return (
    <div className="p-4 border rounded bg-blue-50 space-y-3">
      <h3 className="font-bold mb-2">🔧 Google Drive Debug Panel</h3>
      
      <div className="text-sm space-y-1">
        <p>
          Client ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 
            `${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 20)}...` : 
            'Not configured'}
        </p>
        <p>Signed In: {isSignedIn ? '✅ Yes' : '❌ No'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button 
          onClick={testGoogleDrive}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Test Config
        </button>
        
        <button 
          onClick={checkTokenStatus}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          {showTokenStatus ? 'Hide' : 'Show'} Token Status
        </button>
        
        {isSignedIn && (
          <button 
            onClick={handleRefreshToken}
            className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Refresh Token
          </button>
        )}
      </div>

      {showTokenStatus && tokenStatus && (
        <div className="bg-white p-3 rounded border text-xs space-y-2">
          <h4 className="font-semibold text-sm">📊 Token Status:</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Access Token:</span>
              <span className={tokenStatus.hasAccessToken ? 'text-green-600' : 'text-red-600'}>
                {tokenStatus.hasAccessToken ? ' ✅ Có' : ' ❌ Không'}
              </span>
            </div>
            
            <div>
              <span className="font-medium">Refresh Token:</span>
              <span className={tokenStatus.hasRefreshToken ? 'text-green-600' : 'text-red-600'}>
                {tokenStatus.hasRefreshToken ? ' ✅ Có' : ' ❌ Không'}
              </span>
            </div>
          </div>

          {tokenStatus.timeUntilAccessExpiry && (
            <div>
              <span className="font-medium">Access Token còn lại:</span>
              <span className={tokenStatus.timeUntilAccessExpiry === 'Đã hết hạn' ? 'text-red-600' : 'text-blue-600'}>
                {' ' + tokenStatus.timeUntilAccessExpiry}
              </span>
            </div>
          )}

          {tokenStatus.timeUntilRefreshExpiry && (
            <div>
              <span className="font-medium">Refresh Token còn lại:</span>
              <span className={tokenStatus.timeUntilRefreshExpiry === 'Đã hết hạn' ? 'text-red-600' : 'text-green-600'}>
                {' ' + tokenStatus.timeUntilRefreshExpiry}
              </span>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            {tokenStatus.hasRefreshToken ? 
              '🎉 Có refresh token - bạn sẽ ít phải đăng nhập lại!' : 
              '⚠️ Không có refresh token - cần đăng nhập lại thường xuyên hơn'
            }
          </div>
        </div>
      )}
    </div>
  );
}