'use client';

import { useEffect } from 'react';

export default function GoogleDriveTest() {
  useEffect(() => {
    console.log('=== Google Drive Environment Test ===');
    console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Client ID configured?', !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    console.log('======================================');
  }, []);

  const testConnection = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('❌ Google Client ID not found! Check environment variables.');
      return;
    }
    alert(`✅ Google Client ID found: ${clientId.substring(0, 20)}...`);
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="font-bold mb-2">Google Drive Environment Test</h3>
      <p className="text-sm mb-2">
        Client ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 
          `${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 20)}...` : 
          '❌ Not configured'}
      </p>
      <button 
        onClick={testConnection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Google Drive Config
      </button>
    </div>
  );
}
