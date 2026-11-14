// What to play: today's puzzle (the same for everyone), and "आणखी खेळा" (a random puzzle this phone has not played).
import type { Puzzle } from '@/lib/types';
import { doneAt, startedNumbers, touchedAt } from '@/lib/progress';
import { istToday } from '@/lib/dates';

export const istDay = (ms: number) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);

/**
 * Today's puzzle: the one released today; if several, the lowest number. If none is set for today,
 * the most recently released one. `puzzles`: live, released puzzles (any order).
 * An unfinished puzzle from another day never takes its place.
 */
export function todayPuzzle(puzzles: Puzzle[]): Puzzle | null {
  const today = istToday();
  const real = puzzles.filter((p) => !p.sample && p.live_date && p.live_date <= today);
  const todays = real.filter((p) => p.live_date === today).sort((a, b) => a.number - b.number);
  if (todays.length) return todays[0];
  return [...real].sort((a, b) => (b.live_date ?? '').localeCompare(a.live_date ?? '') || b.number - a.number)[0] ?? null;
}

/**
 * "आणखी खेळा": a random released puzzle this phone has not opened yet (no list, no decision).
 * If every puzzle has been tried, the unfinished one played most recently; null when everything is done.
 */
export function randomUnplayed(puzzles: Puzzle[], excludeId?: string): Puzzle | null {
  const today = istToday();
  const done = doneAt();
  const started = startedNumbers();
  const pool = puzzles.filter((p) => !p.sample && p.live_date && p.live_date <= today && p.id !== excludeId && !done[p.id]);
  const fresh = pool.filter((p) => !started.has(p.number));
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  const touched = touchedAt();
  return [...pool].sort((a, b) => (touched[String(b.number)] ?? 0) - (touched[String(a.number)] ?? 0))[0] ?? null;
}

/** Puzzles started on this phone and not finished, most recently played first. */
export function unfinished(puzzles: Puzzle[]): Puzzle[] {
  const done = doneAt();
  const started = startedNumbers();
  const touched = touchedAt();
  return puzzles
    .filter((p) => !p.sample && started.has(p.number) && !done[p.id])
    .sort((a, b) => (touched[String(b.number)] ?? 0) - (touched[String(a.number)] ?? 0));
}
