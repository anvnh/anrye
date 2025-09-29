import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { title, body, icon, badge, data, tag, requireInteraction } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notification request received' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process notification request' },
      { status: 500 }
    );
  }
}
