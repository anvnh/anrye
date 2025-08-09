import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured' },
        { status: 500 }
      );
    }

    // Use refresh token to get new access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Token refresh failed
      
      // If refresh token is invalid, return 401 so client can re-authenticate
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: response.status }
      );
    }

    const tokens = await response.json();
    
    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      // Note: Google may or may not return a new refresh token
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token })
    });

  } catch (error) {
    // Token refresh error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}