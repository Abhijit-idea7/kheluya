// The sending rules, kept free of Supabase/Deno so they can be tested anywhere.

export type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
export type SendResult = { ok: boolean; gone: boolean };
export type Payload = { title: string; body: string; url: string; tag: string };

export interface Deps {
  /** India date and clock time now, e.g. { day: '2026-11-18', hhmm: '07:15' } */
  nowIst(): { day: string; hhmm: string };
  setting(key: string): Promise<unknown>;
  /** Type name (or name) of today's puzzle, '' if none */
  todayPuzzleName(day: string): Promise<string>;
  /** Claim today's daily slot; false if it was already taken (sent or being sent) */
  claimDaily(day: string, title: string, body: string): Promise<number | null>;
  addLog(kind: 'test' | 'now', title: string, body: string): Promise<number>;
  finishLog(id: number, sent: number, failed: number, removed: number): Promise<void>;
  activeSubs(endpoint?: string): Promise<Sub[]>;
  send(sub: Sub, payload: Payload): Promise<SendResult>;
  markResults(sent: string[], gone: string[], failed: string[]): Promise<void>;
}

const DEFAULT_TIME = '07:00';
const WINDOW_MIN = 4 * 60; // a missed morning is not sent late in the evening

const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

export function fill(template: string, name: string): string {
  return template.replace(/\{name\}/g, name || 'आजचे कोडे').replace(/\s+—\s+$/, '').trim();
}

/** Send one payload to every subscription given, a few at a time. */
export async function sendAll(d: Deps, subs: Sub[], payload: Payload) {
  const sent: string[] = [], gone: string[] = [], failed: string[] = [];
  for (let i = 0; i < subs.length; i += 20) {
    const batch = subs.slice(i, i + 20);
    const res = await Promise.all(batch.map((s) => d.send(s, payload).catch(() => ({ ok: false, gone: false }))));
    res.forEach((r, k) => (r.ok ? sent : r.gone ? gone : failed).push(batch[k].id));
  }
  await d.markResults(sent, gone, failed);
  return { sent: sent.length, removed: gone.length, failed: failed.length };
}

/** Called by the timer every 15 minutes: sends the daily reminder once a day, at or after the set time. */
export async function runTick(d: Deps) {
  if ((await d.setting('push_on')) !== true) return { skipped: 'off' };
  const { day, hhmm } = d.nowIst();
  const at = toMin(String((await d.setting('push_time')) ?? DEFAULT_TIME));
  const start = Number.isFinite(at) ? at : toMin(DEFAULT_TIME);
  const now = toMin(hhmm);
  if (now < start) return { skipped: 'early' };
  if (now > start + WINDOW_MIN) return { skipped: 'late' };
  const name = await d.todayPuzzleName(day);
  const title = fill(String((await d.setting('push_title')) ?? 'आजचे कोडे आले आहे'), name);
  const body = fill(String((await d.setting('push_body')) ?? '{name} — चला खेळूया!'), name);
  const logId = await d.claimDaily(day, title, body);
  if (logId == null) return { skipped: 'done' };
  const r = await sendAll(d, await d.activeSubs(), { title, body, url: '/?s=pn', tag: `ck-daily-${day}` });
  await d.finishLog(logId, r.sent, r.failed, r.removed);
  return { sent: r };
}

/** Admin: a test to one phone, or a special message to everyone now. */
export async function runManual(d: Deps, kind: 'test' | 'now', title: string, body: string, endpoint?: string) {
  const subs = await d.activeSubs(kind === 'test' ? endpoint : undefined);
  if (kind === 'test' && !subs.length) return { error: 'This phone is not switched on for notifications yet.' };
  const logId = await d.addLog(kind, title, body);
  // Its own tag: a new message never silently replaces one already on the phone
  const r = await sendAll(d, subs, { title, body, url: '/?s=pn', tag: `ck-${kind}-${logId}` });
  await d.finishLog(logId, r.sent, r.failed, r.removed);
  return { sent: r };
}
