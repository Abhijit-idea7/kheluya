// The player's own solving times, kept only on their phone (puzzle id → best time in ms).
const KEY = 'ck-my-times';

function readAll(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function myTime(puzzleId: string): number | null {
  const v = readAll()[puzzleId];
  return typeof v === 'number' && v > 0 ? v : null;
}

/** Saves the time if it is this phone's first or fastest solve; returns the best time. */
export function saveMyTime(puzzleId: string, ms: number): number {
  const all = readAll();
  const best = all[puzzleId] && all[puzzleId] > 0 ? Math.min(all[puzzleId], ms) : ms;
  all[puzzleId] = best;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked */
  }
  return best;
}
