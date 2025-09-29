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

// Helper function to ensure URL has a protocol
function ensureProtocol(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Default to https for production
  return `https://${url}`;
}

// Determine a stable base URL for OAuth flows.
// Priority:
// 1. Explicit OAUTH_BASE_URL (no trailing slash)
// 2. req.url origin (fallback)
// NOTE: If the incoming request origin differs from configured base, caller may choose to redirect
export function getBaseUrl(req?: Request): string {
  const configured = (process.env.OAUTH_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) {
    return ensureProtocol(configured);
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
  const configuredUrl = ensureProtocol(configuredRaw);
    
  let configured: URL | null = null;
  try {
    configured = new URL(configuredUrl);
  } catch {
    return { redirect: false }; // invalid configured URL, skip
  }
  try {
    const current = new URL(req.url);
    if (current.host === configured.host) return { redirect: false };
    if (current.host.includes('--')) {
      return { redirect: true, target: `${configured.origin}${current.pathname}${current.search}` };
    }
    return { redirect: false };
  } catch {
    return { redirect: false };
  }
}
