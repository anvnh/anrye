'use client';

import { driveService } from './googleDrive';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  colorId?: string; // Google Calendar color ID ("1".."11")
  recurrence?: string[]; // RFC5545 RRULE lines, e.g. ["RRULE:FREQ=DAILY"]
  recurringEventId?: string; // master recurring event id if this is an instance
  originalStartTime?: string; // ISO datetime of the instance original start
}

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  colorId?: string;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: { dateTime?: string; date?: string; timeZone?: string };
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
  recurrence: e.recurrence,
  recurringEventId: e.recurringEventId,
  originalStartTime: e.originalStartTime?.dateTime || (e.originalStartTime?.date ? new Date(e.originalStartTime.date).toISOString() : undefined),
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

export async function getEvent(eventId: string): Promise<CalendarEvent> {
  const r = await calendarFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`);
  if (!r.ok) throw new Error('CALENDAR_GET_FAILED');
  const j = await r.json();
  const mapped = mapEvent(j);
  if (!mapped) throw new Error('INVALID_EVENT');
  return mapped;
}

export async function createEvent(payload: {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  colorId?: string;
  recurrence?: string[] | string;
}): Promise<CalendarEvent> {
  const body = {
    summary: payload.summary,
    description: payload.description || '',
    start: { dateTime: toISO(payload.start) },
    end: { dateTime: toISO(payload.end) },
    ...(payload.colorId ? { colorId: payload.colorId } : {}),
    ...(payload.recurrence
      ? { recurrence: Array.isArray(payload.recurrence) ? payload.recurrence : [payload.recurrence] }
      : {}),
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
  recurrence?: string[] | string | null; // pass null to clear
}): Promise<CalendarEvent> {
  const body: any = {};
  if (payload.summary !== undefined) body.summary = payload.summary;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.start) body.start = { dateTime: toISO(payload.start) };
  if (payload.end) body.end = { dateTime: toISO(payload.end) };
  if (payload.colorId !== undefined) body.colorId = payload.colorId;
  if (payload.recurrence !== undefined) {
    if (payload.recurrence === null) body.recurrence = [];
    else body.recurrence = Array.isArray(payload.recurrence) ? payload.recurrence : [payload.recurrence];
  }

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

function formatUntilUTC(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function updateRRuleUntil(rrule: string, untilUTC: string): string {
  // Remove existing UNTIL or COUNT then append new UNTIL
  let base = rrule;
  if (!base.startsWith('RRULE:')) base = `RRULE:${base}`;
  base = base.replace(/;UNTIL=[^;]+/i, '').replace(/;COUNT=\d+/i, '');
  return `${base};UNTIL=${untilUTC}`;
}

export async function deleteRecurringScope(opts: {
  eventId: string; // id of the clicked item (could be instance id)
  mode: 'instance' | 'following' | 'all';
  recurringEventId?: string | null; // master id if available
  originalStartTime?: string | null; // ISO of the instance start
}): Promise<void> {
  const { eventId, mode } = opts;
  if (mode === 'instance') {
    await deleteEvent(eventId);
    return;
  }
  const masterId = opts.recurringEventId || eventId;
  if (mode === 'all') {
    await deleteEvent(masterId);
    return;
  }
  // this-and-following: adjust RRULE UNTIL to the moment just before this instance
  if (!opts.recurringEventId || !opts.originalStartTime) {
    // Fallback: delete master if we can't determine boundaries
    await deleteEvent(masterId);
    return;
  }
  const master = await getEvent(masterId);
  const rrules = (master.recurrence || []).filter(r => r.toUpperCase().startsWith('RRULE'));
  if (rrules.length === 0) {
    // Not actually recurring; delete master
    await deleteEvent(masterId);
    return;
  }
  const instStart = new Date(opts.originalStartTime);
  const untilDate = new Date(instStart.getTime() - 1000); // one second before this instance
  const untilUTC = formatUntilUTC(untilDate);
  const newRules = master.recurrence!.map(r => r.toUpperCase().startsWith('RRULE') ? updateRRuleUntil(r, untilUTC) : r);
  await updateEvent(masterId, { recurrence: newRules });
}


