import { NextRequest, NextResponse } from 'next/server';
import { stateStore } from '../route';
import jwt from 'jsonwebtoken';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const redirectUrl = new URL('/notes', request.url);
      redirectUrl.searchParams.set('auth_error', error);
      return NextResponse.redirect(redirectUrl);
    }

    // Validate state parameter
    if (!state || !stateStore.has(state)) {
      const redirectUrl = new URL('/notes', request.url);
      redirectUrl.searchParams.set('auth_error', 'invalid_state');
      return NextResponse.redirect(redirectUrl);
    }

    const stateData = stateStore.get(state)!;
    stateStore.delete(state); // Use state only once

    if (!code) {
      const redirectUrl = new URL('/notes', request.url);
      redirectUrl.searchParams.set('auth_error', 'no_code');
      return NextResponse.redirect(redirectUrl);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      // Missing Google OAuth credentials
      const redirectUrl = new URL('/notes', request.url);
      redirectUrl.searchParams.set('auth_error', 'server_config');
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange authorization code for tokens
    const redirectUri = `${stateData.origin}/api/auth/google/callback`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      // Token exchange failed
      const redirectUrl = new URL('/notes', request.url);
      redirectUrl.searchParams.set('auth_error', 'token_exchange_failed');
      return NextResponse.redirect(redirectUrl);
    }

    const tokens = await tokenResponse.json();
    
    // Validate we got the required tokens
    if (!tokens.access_token) {
      // No access token received
      const redirectUrl = new URL('/notes', request.url);
      redirectUrl.searchParams.set('auth_error', 'no_access_token');
      return NextResponse.redirect(redirectUrl);
    }

    // Create JWT session for app authentication
    const jwtPayload = {
      username: 'google_user', // You might want to fetch actual user info from Google
      loginTime: Date.now(),
      provider: 'google'
    };
    
    const authToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '30d' });

    // Create success page with tokens that will be handled by client-side script
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Authorization Successful</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #222831;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        .success {
            color: #22c55e;
            font-size: 1.25rem;
            margin-bottom: 1rem;
        }
        .info {
            color: #6b7280;
            margin-bottom: 1rem;
        }
        .spinner {
            border: 3px solid #f3f4f6;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">Authorization Successful!</div>
        <div class="info">You have been successfully authenticated with Google Drive.</div>
        <div class="spinner"></div>
        <div style="margin-top: 1rem; color: #6b7280;">Redirecting...</div>
    </div>

    <script>
        // Send tokens to parent window and close popup
        const tokens = ${JSON.stringify(tokens)};
        
        // Support both popup and redirect flows
        if (window.opener) {
            // We're in a popup window
            window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                tokens: tokens
            }, '${stateData.origin}');
            window.close();
        } else {
            // We're in the same window (redirect flow)
            localStorage.setItem('google_drive_tokens_temp', JSON.stringify(tokens));
            window.location.href = '/notes?auth_success=true';
        }
    </script>
</body>
</html>`;

    return new Response(successHtml, {
      headers: { 
        'Content-Type': 'text/html',
        'Set-Cookie': `auth-token=${authToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      },
    });

  } catch (error) {
    // Callback error
    const redirectUrl = new URL('/notes', request.url);
    redirectUrl.searchParams.set('auth_error', 'callback_error');
    return NextResponse.redirect(redirectUrl);
  }
}