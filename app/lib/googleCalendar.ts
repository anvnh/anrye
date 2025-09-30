'use client';

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
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
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
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
};

function toISO(date: Date): string {
  return date.toISOString();
}

function getLocalTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function getCalendarBearer(): Promise<string> {
  const r = await fetch("/api/auth/google/calendar/token", { method: "POST" });
  if (!r.ok) throw new Error("NO_CALENDAR_TOKEN");
  const j = await r.json();
  return j.access_token as string;
}

function ensureBearer(): Promise<string> {
  return getCalendarBearer();
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
    reminders: e.reminders,
  };
}

async function calendarFetch(input: string, init?: RequestInit): Promise<Response> {
  // For client-side calls, we'll use our API routes instead of direct Google API calls
  // This function is kept for backward compatibility but will be replaced
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
    try {
      const token2 = await getCalendarBearer();
      r = await doFetch(token2);
    } catch {
      // Token refresh failed, return original response
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
  
  // Use our API route instead of direct Google API call
  const r = await fetch(`/api/calendar/events?${params.toString()}`);
  if (!r.ok) throw new Error('CALENDAR_LIST_FAILED');
  const j = await r.json();
  return (j.items || []).map(mapEvent).filter(Boolean) as CalendarEvent[];
}

export async function getEvent(eventId: string): Promise<CalendarEvent> {
  // Use our API route instead of direct Google API call
  const r = await fetch(`/api/calendar/events/${encodeURIComponent(eventId)}`);
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
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}): Promise<CalendarEvent> {
  const tz = getLocalTimeZone();
  const normalizeRecurrence = (rec?: string[] | string) => {
    if (!rec) return undefined;
    const arr = Array.isArray(rec) ? rec : [rec];
    const cleaned = arr
      .map(r => (r || '').trim())
      .filter(Boolean)
      .map(r => (r.toUpperCase().startsWith('RRULE') ? r.toUpperCase().startsWith('RRULE:') ? r : `RRULE:${r}` : r));
    return cleaned.length > 0 ? cleaned : undefined;
  };

  const body = {
    summary: payload.summary,
    description: payload.description || '',
    start: { dateTime: toISO(payload.start), timeZone: tz },
    end: { dateTime: toISO(payload.end), timeZone: tz },
    ...(payload.colorId ? { colorId: payload.colorId } : {}),
    ...(normalizeRecurrence(payload.recurrence) ? { recurrence: normalizeRecurrence(payload.recurrence) } : {}),
    ...(payload.reminders ? { reminders: payload.reminders } : {}),
  };
  // Use our API route instead of direct Google API call
  const r = await fetch('/api/calendar/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let detail = '';
    try {
      detail = await r.text();
      // try parse JSON error
      try {
        const j = JSON.parse(detail);
        detail = j?.error?.message || detail;
      } catch {}
    } catch {}
    console.error('CALENDAR_CREATE_FAILED', { status: r.status, detail, body });
    throw new Error('CALENDAR_CREATE_FAILED');
  }
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
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  } | null; // pass null to clear
}): Promise<CalendarEvent> {
  const tz = getLocalTimeZone();
  const body: any = {};
  if (payload.summary !== undefined) body.summary = payload.summary;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.start) body.start = { dateTime: toISO(payload.start), timeZone: tz };
  if (payload.end) body.end = { dateTime: toISO(payload.end), timeZone: tz };
  if (payload.colorId !== undefined) body.colorId = payload.colorId;
  if (payload.recurrence !== undefined) {
    if (payload.recurrence === null) body.recurrence = [];
    else {
      const arr = Array.isArray(payload.recurrence) ? payload.recurrence : [payload.recurrence];
      body.recurrence = arr
        .map(r => (r || '').trim())
        .filter(Boolean)
        .map(r => (r.toUpperCase().startsWith('RRULE') ? r.toUpperCase().startsWith('RRULE:') ? r : `RRULE:${r}` : r));
    }
  }
  if (payload.reminders !== undefined) {
    if (payload.reminders === null) body.reminders = { useDefault: true };
    else body.reminders = payload.reminders;
  }

  // Use our API route instead of direct Google API call
  const r = await fetch(`/api/calendar/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let detail = '';
    try {
      detail = await r.text();
      try {
        const j = JSON.parse(detail);
        detail = j?.error?.message || detail;
      } catch {}
    } catch {}
    console.error('CALENDAR_UPDATE_FAILED', { status: r.status, detail, body });
    throw new Error('CALENDAR_UPDATE_FAILED');
  }
  const j = await r.json();
  const mapped = mapEvent(j);
  if (!mapped) throw new Error('INVALID_EVENT');
  return mapped;
}

export async function deleteEvent(eventId: string): Promise<void> {
  // Use our API route instead of direct Google API call
  const r = await fetch(`/api/calendar/events/${encodeURIComponent(eventId)}`, {
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


