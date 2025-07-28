// Utility function to safely get environment variables in both client and server
export function getGoogleClientId(): string | undefined {
  // For client-side, try multiple ways to get the environment variable
  if (typeof window !== 'undefined') {
    // First try Next.js injected env
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }
  
  // For server-side
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

export function isGoogleClientIdConfigured(): boolean {
  const clientId = getGoogleClientId();
  return !!(clientId && clientId.trim() !== '');
}
