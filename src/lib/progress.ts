// What this phone has done, kept only on the phone. No sign-in.
import { SHARED_STORAGE_KEYS } from '@/lib/bridge';

const DONE_KEY = 'ck-done';

function readDone(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(DONE_KEY) || '{}') as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    // keep only well-formed entries (puzzle id → time), so damaged data never breaks a page
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

/** Puzzle id → when this phone first completed it (ms). */
export function doneAt(): Record<string, number> {
  return readDone();
}

/** Puzzle ids this phone has completed. */
export function doneIds(): Set<string> {
  return new Set(Object.keys(readDone()));
}

export function markDone(puzzleId: string): void {
  const all = readDone();
  if (all[puzzleId]) return;
  all[puzzleId] = Date.now();
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(all));
  } catch {
    /* storage blocked */
  }
}

/**
 * Puzzle numbers this phone has saved progress for. Each puzzle stores its progress
 * as "p<number>:<key>" (see the bridge), so a saved key means the puzzle was started.
 */
export function startedNumbers(): Set<number> {
  const out = new Set<number>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? '';
      const m = k.match(/^p(\d+):(.+)$/);
      if (m && !SHARED_STORAGE_KEYS.includes(m[2])) out.add(Number(m[1]));
    }
  } catch {
    /* storage blocked */
  }
  return out;
}
