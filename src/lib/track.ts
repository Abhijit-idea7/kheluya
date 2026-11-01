import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';

export type EventName = 'opened' | 'started' | 'completed' | 'shared' | 'arrived' | 'left' | 'suggested';
export type Channel = 'whatsapp' | 'facebook' | 'instagram' | 'copy' | 'native' | 'other';

const PLAYER_KEY = 'ck-player';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** One anonymous id per phone, kept in the browser. No name, no number. */
export function playerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  } catch {
    return uuid();
  }
}

export function newSessionId(): string {
  return uuid();
}

const REF_TO_CHANNEL: Record<string, string> = { wa: 'wa', fb: 'fb', ig: 'ig', cp: 'cp', sh: 'sh' };
/** The ?s= tag on a shared link, if any. */
export function readRef(search: string): string | null {
  const s = new URLSearchParams(search).get('s');
  return s && REF_TO_CHANNEL[s] ? s : s ? 'other' : null;
}

type EventRow = {
  puzzle_id: string;
  session_id: string;
  event: EventName;
  channel?: Channel | null;
  source?: 'puzzle' | 'page' | null;
  ref?: string | null;
  value_ms?: number | null;
  mistakes?: number | null;
  hints?: number | null;
};

/**
 * Send one event. Uses fetch with keepalive so it survives the page closing.
 * Sample puzzles (no database yet) are only logged to the console.
 */
export function track(row: EventRow): void {
  if (row.puzzle_id.startsWith('sample-') || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (import.meta.env.DEV) console.info('[ck-track]', row);
    return;
  }
  const clean = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : null);
  const body = {
    puzzle_id: row.puzzle_id,
    player_id: playerId(),
    session_id: row.session_id,
    event: row.event,
    channel: row.channel ?? null,
    source: row.source ?? null,
    ref: row.ref ?? null,
    value_ms: clean(row.value_ms) !== null ? Math.min(clean(row.value_ms)!, 86400000) : null,
    mistakes: clean(row.mistakes),
    hints: clean(row.hints),
  };
  try {
    fetch(`${SUPABASE_URL}/rest/v1/play_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // never let counting break a puzzle
  }
}

/**
 * Record that this phone arrived at a puzzle through a shared link, at most once
 * per puzzle, per share channel, per India day — however often the page reloads.
 */
export function trackArrival(puzzleId: string, sessionId: string, ref: string | null): void {
  if (!ref) return;
  const day = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const key = `ck-arr:${puzzleId}:${ref}:${day}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    /* storage blocked: count once per page load */
  }
  track({ puzzle_id: puzzleId, session_id: sessionId, event: 'arrived', ref });
}
