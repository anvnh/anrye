import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { shortId, note, settings } = await request.json();
    const { db } = await connectToDatabase();

    // Handle Expires At
    let expireDate = null;
    if (settings.expireAt) {
      expireDate = new Date(settings.expireAt);
      if (isNaN(expireDate.getTime())) expireDate = null;
    }

    await db.collection('sharedNotes').updateOne(
      { shortId },
      {
        $set: {
          note,
          settings,
          createdAt: new Date().toISOString(),
          expireAt: expireDate || null
        }
      },
      { upsert: true }
    );

    // Tạo TTL index nếu chưa có (chỉ tạo 1 lần)
    await db.collection('sharedNotes').createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0, background: true }
    );

    // ...existing code...
    return NextResponse.json({ success: true, shortId });
  } catch (error) {
    // ...existing code...
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

    const { db } = await connectToDatabase();
    const sharedNote = await db.collection('sharedNotes').findOne({ shortId });

    if (!sharedNote) {
      return NextResponse.json({ error: 'Shared note not found' }, { status: 404 });
    }

    // Trả về đúng định dạng cũ (không trả về _id)
    const { note, settings, createdAt } = sharedNote;
    return NextResponse.json({ note, settings, createdAt });
  } catch (error) {
    // ...existing code...
    return NextResponse.json({ error: 'Failed to fetch shared note' }, { status: 500 });
  }
}
