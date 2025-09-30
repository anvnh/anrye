// Debug utility for localStorage token issues
export function debugLocalStorage(): void {
  if (typeof window === 'undefined') return;

  console.log('=== LocalStorage Debug Info ===');
  
  // Check google_drive_token
  const tokenRaw = localStorage.getItem('google_drive_token');
  if (tokenRaw) {
    console.log('google_drive_token exists, length:', tokenRaw.length);
    console.log('First 100 chars:', tokenRaw.substring(0, 100));
    console.log('Last 100 chars:', tokenRaw.substring(Math.max(0, tokenRaw.length - 100)));
    
    try {
      const parsed = JSON.parse(tokenRaw);
      console.log('google_drive_token is valid JSON:', !!parsed);
      console.log('Has access_token:', !!parsed?.access_token);
    } catch (error) {
      console.error('google_drive_token is invalid JSON:', error);
    }
  } else {
    console.log('google_drive_token does not exist');
  }

  // Check google_drive_tokens_temp
  const tempTokens = localStorage.getItem('google_drive_tokens_temp');
  if (tempTokens) {
    console.log('google_drive_tokens_temp exists, length:', tempTokens.length);
    console.log('First 100 chars:', tempTokens.substring(0, 100));
    console.log('Last 100 chars:', tempTokens.substring(Math.max(0, tempTokens.length - 100)));
    
    try {
      const parsed = JSON.parse(tempTokens);
      console.log('google_drive_tokens_temp is valid JSON:', !!parsed);
      console.log('Has access_token:', !!parsed?.access_token);
    } catch (error) {
      console.error('google_drive_tokens_temp is invalid JSON:', error);
    }
  } else {
    console.log('google_drive_tokens_temp does not exist');
  }

  // Check other auth-related keys
  const authKeys = ['google_drive_token_backup', 'gc_refresh', 'auth_token'];
  authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      console.log(`${key} exists, length:`, value.length);
    } else {
      console.log(`${key} does not exist`);
    }
  });

  console.log('=== End Debug Info ===');
}

export function cleanCorruptedTokens(): void {
  if (typeof window === 'undefined') return;

  console.log('Cleaning corrupted tokens...');
  
  const keysToCheck = ['google_drive_token', 'google_drive_tokens_temp', 'google_drive_token_backup'];
  let cleaned = 0;

  keysToCheck.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        // Try to parse as JSON
        JSON.parse(value);
        console.log(`${key} is valid, keeping`);
      } catch (error) {
        console.log(`${key} is corrupted, removing`);
        localStorage.removeItem(key);
        cleaned++;
      }
    }
  });

  console.log(`Cleaned ${cleaned} corrupted tokens`);
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugLocalStorage = debugLocalStorage;
  (window as any).cleanCorruptedTokens = cleanCorruptedTokens;
}