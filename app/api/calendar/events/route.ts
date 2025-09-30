import { NextResponse, NextRequest } from "next/server";
import { getCalendarBearerFromRequest } from "@/app/lib/calendarServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const singleEvents = searchParams.get('singleEvents') || 'true';
    const orderBy = searchParams.get('orderBy') || 'startTime';
    const maxResults = searchParams.get('maxResults') || '2500';

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: 'Missing timeMin or timeMax parameters' }, { status: 400 });
    }

    const token = await getCalendarBearerFromRequest(req as NextRequest);
    
    const params = new URLSearchParams({
      singleEvents,
      orderBy,
      timeMin,
      timeMax,
      maxResults,
    });

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = await getCalendarBearerFromRequest(req as NextRequest);

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error creating event:', errorData);
      return NextResponse.json({ error: 'Failed to create event' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
