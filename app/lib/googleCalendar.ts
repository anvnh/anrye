'use client';

import { driveService } from './googleDrive';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  colorId?: string; // Google Calendar color ID ("1".."11")
}

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  colorId?: string;
};

function toISO(date: Date): string {
  return date.toISOString();
}

function ensureBearer(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await driveService.getAccessToken();
      if (!token) return reject(new Error('NO_TOKEN'));
      resolve(token);
    } catch (e) {
      reject(e);
    }
  });
}

function mapEvent(e: GoogleCalendarEvent): CalendarEvent | null {
  const startISO = e.start?.dateTime || (e.start?.date ? new Date(e.start.date).toISOString() : undefined);
  const endISO = e.end?.dateTime || (e.end?.date ? new Date(e.end.date).toISOString() : undefined);
  if (!e.id || !startISO || !endISO) return null;
  return {
    id: e.id,
    summary: e.summary || 'Untitled',
    description: e.description,
    start: startISO,
  end: endISO,
  colorId: e.colorId,
  };
}

async function calendarFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = await ensureBearer();
  const doFetch = (t: string) => fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      Authorization: `Bearer ${t}`,
    },
  });

  let r = await doFetch(token);
  if (r.status === 401 || r.status === 403) {
    const ok = await driveService.refreshAccessToken();
    if (ok) {
      const token2 = await ensureBearer();
      r = await doFetch(token2);
    }
  }
  return r;
}

export async function listEvents(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: toISO(timeMin),
    timeMax: toISO(timeMax),
    maxResults: '2500',
  });
  const r = await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`);
  if (!r.ok) throw new Error('CALENDAR_LIST_FAILED');
  const j = await r.json();
  return (j.items || []).map(mapEvent).filter(Boolean) as CalendarEvent[];
}

export async function createEvent(payload: {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  colorId?: string;
}): Promise<CalendarEvent> {
  const body = {
    summary: payload.summary,
    description: payload.description || '',
    start: { dateTime: toISO(payload.start) },
    end: { dateTime: toISO(payload.end) },
    ...(payload.colorId ? { colorId: payload.colorId } : {}),
  };
  const r = await calendarFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('CALENDAR_CREATE_FAILED');
  const j = await r.json();
  const mapped = mapEvent(j);
  if (!mapped) throw new Error('INVALID_EVENT');
  return mapped;
}

export async function updateEvent(eventId: string, payload: {
  summary?: string;
  description?: string;
  start?: Date;
  end?: Date;
  colorId?: string;
}): Promise<CalendarEvent> {
  const body: any = {};
  if (payload.summary !== undefined) body.summary = payload.summary;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.start) body.start = { dateTime: toISO(payload.start) };
  if (payload.end) body.end = { dateTime: toISO(payload.end) };
  if (payload.colorId !== undefined) body.colorId = payload.colorId;

  const r = await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('CALENDAR_UPDATE_FAILED');
  const j = await r.json();
  const mapped = mapEvent(j);
  if (!mapped) throw new Error('INVALID_EVENT');
  return mapped;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const r = await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  });
  if (!r.ok) throw new Error('CALENDAR_DELETE_FAILED');
}


