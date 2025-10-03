import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function POST(request: NextRequest) {
  try {
    const { url, token } = await request.json();

    if (!url || !token) {
      return NextResponse.json(
        { error: 'Missing Turso configuration' },
        { status: 400 }
      );
    }

    // Validate URL format
    if (!url.startsWith('libsql://')) {
      throw new Error('Invalid Turso database URL format (should start with libsql://)');
    }

    // Test actual Turso connection
    const client = createClient({ 
      url, 
      authToken: token 
    });

    // Test connection with a simple query
    const result = await client.execute('SELECT 1 as test');
    
    // Verify we got a response
    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Connection test failed - no response from database');
    }

    return NextResponse.json({ 
      success: true,
      message: 'Turso connection successful'
    });

  } catch (error: any) {
    let errorMessage = 'Turso connection failed';
    
    if (error?.message?.includes('UNAUTHORIZED')) {
      errorMessage = 'Invalid auth token';
    } else if (error?.message?.includes('NOT_FOUND')) {
      errorMessage = 'Database not found';
    } else if (error?.message?.includes('INVALID_URL')) {
      errorMessage = 'Invalid database URL';
    } else if (error?.message?.includes('NETWORK_ERROR')) {
      errorMessage = 'Network error - check URL and connectivity';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
