import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory storage (in production, use a real database)
let sharedNotes: Record<string, any> = {};

export async function POST(request: NextRequest) {
  try {
    const { shortId, note, settings } = await request.json();
    
    // Save the shared note
    sharedNotes[shortId] = {
      note,
      settings,
      createdAt: new Date().toISOString()
    };
    
    console.log('Saved shared note to server:', shortId);
    
    return NextResponse.json({ success: true, shortId });
  } catch (error) {
    console.error('Error saving shared note:', error);
    return NextResponse.json({ error: 'Failed to save shared note' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shortId = searchParams.get('id');
    
    if (!shortId) {
      return NextResponse.json({ error: 'Missing shortId' }, { status: 400 });
    }
    
    const sharedNote = sharedNotes[shortId];
    
    if (!sharedNote) {
      return NextResponse.json({ error: 'Shared note not found' }, { status: 404 });
    }
    
    return NextResponse.json(sharedNote);
  } catch (error) {
    console.error('Error fetching shared note:', error);
    return NextResponse.json({ error: 'Failed to fetch shared note' }, { status: 500 });
  }
}
