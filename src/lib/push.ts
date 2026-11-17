// Daily reminder notifications, from the player's side. No login: the subscription belongs to this phone.
import { supabase } from '@/lib/supabase';
import { playerId } from '@/lib/track';
import { doneAt } from '@/lib/progress';
import { istDay } from '@/lib/next';
import { mrDigits } from '@/lib/dates';

const STATE_KEY = 'ck-push'; // 'on' | 'off'
const ASKS_KEY = 'ck-push-asks'; // how many times the floating card was shown
const ASKED_AT_KEY = 'ck-push-asked-at';
const MAX_ASKS = 3;
const ASK_GAP_MS = 7 * 86400000;

export type PushStatus = 'on' | 'off' | 'blocked' | 'unsupported';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

let keyCache: string | null | undefined;
/** The site's public notification key; null until the admin has set notifications up. */
export async function publicKey(): Promise<string | null> {
  if (keyCache !== undefined) return keyCache;
  if (!supabase) return (keyCache = null);
  const { data, error } = await supabase.rpc('public_push_key');
  // A text result; tolerate a one-row table shape too
  const v = Array.isArray(data) ? Object.values((data[0] ?? {}) as Record<string, unknown>)[0] : data;
  keyCache = error || typeof v !== 'string' || !v ? null : v;
  return keyCache;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function pushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub && ls.get(STATE_KEY) !== 'off' ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

function keyBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Call straight from a button tap: asks the phone, then saves the subscription. */
export async function turnOn(): Promise<PushStatus | 'error'> {
  if (!pushSupported() || !supabase) return 'unsupported';
  // Ask first, while the tap is still "fresh" for the browser.
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm === 'denied') return 'blocked';
  if (perm !== 'granted') return 'off';
  try {
    const key = await publicKey();
    if (!key) return 'error';
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const { error } = await supabase.rpc('public_push_subscribe', {
      p_endpoint: j.endpoint,
      p_p256dh: j.keys?.p256dh,
      p_auth: j.keys?.auth,
      p_player: playerId(),
    });
    if (error) return 'error';
    ls.set(STATE_KEY, 'on');
    return 'on';
  } catch {
    return 'error';
  }
}

export async function turnOff(): Promise<PushStatus> {
  ls.set(STATE_KEY, 'off');
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      await supabase?.rpc('public_push_unsubscribe', { p_endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch {
    /* ignore */
  }
  return 'off';
}

/** This phone's endpoint (for Admin's "send a test to this phone"). */
export async function myEndpoint(): Promise<string | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub?.endpoint ?? null;
  } catch {
    return null;
  }
}

/**
 * The floating card after a finish: only for players who have solved on 2+ different days, at most 3 times,
 * at least 7 days apart, and never once they said yes or blocked notifications.
 */
export async function shouldAsk(settingOn: boolean): Promise<boolean> {
  if (!settingOn || !pushSupported()) return false;
  const days = new Set(Object.values(doneAt()).map((ms) => istDay(ms)));
  if (days.size < 2) return false;
  const asks = Number(ls.get(ASKS_KEY) || 0);
  const last = Number(ls.get(ASKED_AT_KEY) || 0);
  if (asks >= MAX_ASKS || Date.now() - last < ASK_GAP_MS) return false;
  if ((await pushStatus()) !== 'off') return false;
  return !!(await publicKey());
}

export function noteAsked(): void {
  ls.set(ASKS_KEY, String(Number(ls.get(ASKS_KEY) || 0) + 1));
  ls.set(ASKED_AT_KEY, String(Date.now()));
}

/** "07:00" → "सकाळी ७ वाजता" (or "7 am" in English) */
export function timeLabel(hhmm: unknown, lang: 'mr' | 'en'): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '07:00'));
  const h = m ? Number(m[1]) : 7;
  const mi = m ? Number(m[2]) : 0;
  if (lang === 'en') return `${((h + 11) % 12) + 1}${mi ? `:${String(mi).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
  const part = h < 12 ? 'सकाळी' : h < 17 ? 'दुपारी' : 'संध्याकाळी';
  const h12 = ((h + 11) % 12) + 1;
  return `${part} ${mrDigits(h12)}${mi ? `:${mrDigits(String(mi).padStart(2, '0'))}` : ''} वाजता`;
}
