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
    const noteId = searchParams.get('noteId');
    const title = searchParams.get('title');

    const { db } = await connectToDatabase();

    // If shortId is provided, get specific shared note
    if (shortId) {
      const sharedNote = await db.collection('sharedNotes').findOne({ shortId });

      if (!sharedNote) {
        return NextResponse.json({ error: 'Shared note not found' }, { status: 404 });
      }

      // Trả về đúng định dạng cũ (không trả về _id)
      const { note, settings, createdAt } = sharedNote;
      return NextResponse.json({ note, settings, createdAt });
    }

    // If noteId or title is provided, get all shared notes for that note
    if (noteId || title) {
      const orCriteria: any[] = [];
      if (noteId) orCriteria.push({ 'note.id': noteId });
      if (title) orCriteria.push({ 'note.title': title });

      const query = orCriteria.length > 0 ? { $or: orCriteria } : {};
      const sharedNotes = await db.collection('sharedNotes')
        .find(query)
        .project({
          shortId: 1,
          settings: 1,
          createdAt: 1,
          expireAt: 1,
          _id: 0
        })
        .toArray();

      return NextResponse.json({ sharedNotes });
    }

    return NextResponse.json({ error: 'Missing shortId or noteId or title' }, { status: 400 });
  } catch (error) {
    // ...existing code...
    return NextResponse.json({ error: 'Failed to fetch shared note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shortId = searchParams.get('id');

    if (!shortId) {
      return NextResponse.json({ error: 'Missing shortId' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('sharedNotes').deleteOne({ shortId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Shared note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shared note:', error);
    return NextResponse.json({ error: 'Failed to delete shared note' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { shortId, settings } = await request.json();
    
    if (!shortId) {
      return NextResponse.json({ error: 'Missing shortId' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Handle Expires At
    let expireDate = null;
    if (settings.expireAt) {
      expireDate = new Date(settings.expireAt);
      if (isNaN(expireDate.getTime())) expireDate = null;
    }

    const updateData: any = {
      settings,
      expireAt: expireDate || null
    };

    const result = await db.collection('sharedNotes').updateOne(
      { shortId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Shared note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating shared note:', error);
    return NextResponse.json({ error: 'Failed to update shared note' }, { status: 500 });
  }
}
