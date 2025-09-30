'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DebugLocalStorage() {
  const [debugInfo, setDebugInfo] = useState<string>('');

  const runDebug = () => {
    if (typeof window === 'undefined') return;

    let info = '=== LocalStorage Debug Info ===\n';
    
    // Check google_drive_token
    const tokenRaw = localStorage.getItem('google_drive_token');
    if (tokenRaw) {
      info += `google_drive_token exists, length: ${tokenRaw.length}\n`;
      info += `First 100 chars: ${tokenRaw.substring(0, 100)}\n`;
      info += `Last 100 chars: ${tokenRaw.substring(Math.max(0, tokenRaw.length - 100))}\n`;
      
      try {
        const parsed = JSON.parse(tokenRaw);
        info += `google_drive_token is valid JSON: ${!!parsed}\n`;
        info += `Has access_token: ${!!parsed?.access_token}\n`;
      } catch (error) {
        info += `google_drive_token is invalid JSON: ${error}\n`;
      }
    } else {
      info += 'google_drive_token does not exist\n';
    }

    // Check google_drive_tokens_temp
    const tempTokens = localStorage.getItem('google_drive_tokens_temp');
    if (tempTokens) {
      info += `google_drive_tokens_temp exists, length: ${tempTokens.length}\n`;
      info += `First 100 chars: ${tempTokens.substring(0, 100)}\n`;
      info += `Last 100 chars: ${tempTokens.substring(Math.max(0, tempTokens.length - 100))}\n`;
      
      try {
        const parsed = JSON.parse(tempTokens);
        info += `google_drive_tokens_temp is valid JSON: ${!!parsed}\n`;
        info += `Has access_token: ${!!parsed?.access_token}\n`;
      } catch (error) {
        info += `google_drive_tokens_temp is invalid JSON: ${error}\n`;
      }
    } else {
      info += 'google_drive_tokens_temp does not exist\n';
    }

    // Check other auth-related keys
    const authKeys = ['google_drive_token_backup', 'gc_refresh', 'auth_token'];
    authKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        info += `${key} exists, length: ${value.length}\n`;
      } else {
        info += `${key} does not exist\n`;
      }
    });

    info += '=== End Debug Info ===';
    setDebugInfo(info);
  };

  const cleanCorruptedTokens = () => {
    if (typeof window === 'undefined') return;

    let cleaned = 0;
    const keysToCheck = ['google_drive_token', 'google_drive_tokens_temp', 'google_drive_token_backup'];
    
    keysToCheck.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          JSON.parse(value);
        } catch (error) {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });

    setDebugInfo(`Cleaned ${cleaned} corrupted tokens`);
  };

  const clearAllTokens = () => {
    if (typeof window === 'undefined') return;

    const keysToRemove = ['google_drive_token', 'google_drive_tokens_temp', 'google_drive_token_backup', 'gc_refresh'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setDebugInfo('All tokens cleared');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>LocalStorage Debug Tool</CardTitle>
        <CardDescription>
          Use this tool to debug and clean up corrupted authentication tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDebug}>Run Debug</Button>
          <Button onClick={cleanCorruptedTokens} variant="outline">Clean Corrupted</Button>
          <Button onClick={clearAllTokens} variant="destructive">Clear All Tokens</Button>
        </div>
        
        {debugInfo && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Debug Output:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {debugInfo}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
