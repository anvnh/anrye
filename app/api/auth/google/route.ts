import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Store state temporarily in memory (in production, use Redis or database)
const stateStore = new Map<string, { timestamp: number; origin: string }>();

// Clean up old states every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of stateStore.entries()) {
    if (now - value.timestamp > 60 * 60 * 1000) { // 1 hour
      stateStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

export async function GET(request: NextRequest) {
  try {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'login') {
      // Generate OAuth authorization URL
      if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json(
          { error: 'Google Client ID not configured' },
          { status: 500 }
        );
      }

  // Generate random state parameter for CSRF protection
  const state = randomBytes(32).toString('hex');
  // Derive origin from the request URL to support direct navigation (no Origin header)
  const origin = `${url.protocol}//${url.host}`;
      
      // Store state with timestamp
      stateStore.set(state, { timestamp: Date.now(), origin });

      const redirectUri = `${origin}/api/auth/google/callback`;
      
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file');
      authUrl.searchParams.set('access_type', 'offline'); // This is crucial for refresh tokens
      authUrl.searchParams.set('prompt', 'consent'); // Force consent to ensure refresh token
      authUrl.searchParams.set('state', state);

      // Support redirect mode for consistent behavior
      const wantsRedirect = url.searchParams.get('mode') === 'redirect';
      
      if (wantsRedirect) {
        // Redirect directly to Google OAuth for same-window flow
        return NextResponse.redirect(authUrl.toString());
      }

      // Default: return JSON for programmatic fetch (popup flow)
      return NextResponse.json({ authUrl: authUrl.toString() });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    // OAuth error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export { stateStore };