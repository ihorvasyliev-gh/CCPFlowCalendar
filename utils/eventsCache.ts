import { Event } from '../types';

const EVENTS_CACHE_KEY = 'ccp_events_cache';
const EVENTS_CACHE_TIMESTAMP_KEY = 'ccp_events_cache_timestamp';
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 минуты

interface CachedEvents {
  events: Event[];
  timestamp: number;
}

/** Сериализуем события для localStorage (Date → ISO string) */
function serialize(events: Event[]): string {
  const raw = events.map((e) => ({
    ...e,
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    attachments: e.attachments?.map((a) => ({ ...a, uploadedAt: (a.uploadedAt as Date).toISOString() })),
    comments: e.comments?.map((c) => ({ ...c, createdAt: (c.createdAt as Date).toISOString() })),
    history: e.history?.map((h) => ({ ...h, timestamp: (h.timestamp as Date).toISOString() })),
    recurrence: e.recurrence
      ? {
          ...e.recurrence,
          endDate: e.recurrence.endDate ? (e.recurrence.endDate as Date).toISOString() : undefined
        }
      : undefined
  }));
  return JSON.stringify(raw);
}

/** Восстанавливаем Date из ISO строк */
function deserialize(json: string): Event[] {
  const raw = JSON.parse(json) as any[];
  return raw.map((e) => ({
    ...e,
    date: new Date(e.date),
    createdAt: new Date(e.createdAt),
    attachments: e.attachments?.map((a: any) => ({ ...a, uploadedAt: new Date(a.uploadedAt) })),
    comments: e.comments?.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })),
    history: e.history?.map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })),
    recurrence: e.recurrence
      ? {
          ...e.recurrence,
          endDate: e.recurrence.endDate ? new Date(e.recurrence.endDate) : undefined
        }
      : undefined
  }));
}

export function cacheEvents(events: Event[]): void {
  try {
    const cached: CachedEvents = { events, timestamp: Date.now() };
    localStorage.setItem(EVENTS_CACHE_KEY, serialize(events));
    localStorage.setItem(EVENTS_CACHE_TIMESTAMP_KEY, cached.timestamp.toString());
  } catch (err) {
    console.warn('Failed to cache events:', err);
  }
}

export function getCachedEvents(): Event[] | null {
  try {
    const json = localStorage.getItem(EVENTS_CACHE_KEY);
    if (!json) return null;

    const ts = localStorage.getItem(EVENTS_CACHE_TIMESTAMP_KEY);
    const age = ts ? Date.now() - parseInt(ts, 10) : Infinity;
    if (age > CACHE_DURATION_MS) {
      clearEventsCache();
      return null;
    }

    return deserialize(json);
  } catch {
    clearEventsCache();
    return null;
  }
}

export function clearEventsCache(): void {
  try {
    localStorage.removeItem(EVENTS_CACHE_KEY);
    localStorage.removeItem(EVENTS_CACHE_TIMESTAMP_KEY);
  } catch (err) {
    console.warn('Failed to clear events cache:', err);
  }
}
