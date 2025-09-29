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

// Determine a stable base URL for OAuth flows.
// Priority:
// 1. Explicit OAUTH_BASE_URL (no trailing slash)
// 2. req.url origin (fallback)
// NOTE: If the incoming request origin differs from configured base, caller may choose to redirect
export function getBaseUrl(req?: Request): string {
  const configured = (process.env.OAUTH_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) {
    // Ensure the configured URL has a protocol
    if (configured.startsWith('http://') || configured.startsWith('https://')) {
      return configured;
    } else {
      // Default to https for production
      return `https://${configured}`;
    }
  }
  if (req) {
    try {
      const u = new URL(req.url);
      return u.origin;
    } catch {
      // ignore
    }
  }
  return '';
}

// Utility to decide if we should force migrate the flow to the configured base domain.
export function needsBaseRedirect(req: Request): { redirect: boolean; target?: string } {
  const configuredRaw = (process.env.OAUTH_BASE_URL || '').trim().replace(/\/$/, '');
  if (!configuredRaw) return { redirect: false };
  
  // Ensure configured URL has protocol
  const configuredUrl = configuredRaw.startsWith('http://') || configuredRaw.startsWith('https://') 
    ? configuredRaw 
    : `https://${configuredRaw}`;
    
  let configured: URL | null = null;
  try {
    configured = new URL(configuredUrl);
  } catch {
    return { redirect: false }; // invalid configured URL, skip
  }
  try {
    const current = new URL(req.url);
    // If hosts match exactly (ignore protocol), no redirect
    if (current.host === configured.host) return { redirect: false };
    // Only attempt redirect for Netlify preview style domains (hash--site)
    // This should only redirect FROM preview domains TO the configured domain
    if (current.host.includes('--')) {
      return { redirect: true, target: `${configured.origin}${current.pathname}${current.search}` };
    }
    return { redirect: false };
  } catch {
    return { redirect: false };
  }
}
