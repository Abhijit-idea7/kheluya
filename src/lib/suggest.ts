import type { Puzzle } from '@/lib/types';
import { doneIds, startedNumbers } from '@/lib/progress';

export type Reason = 'resume' | 'quick' | 'liked' | 'new';
export type Suggestion = { puzzle: Puzzle; reason: Reason };
/** Where a suggestion was shown: after finishing, after leaving early, or on Home. */
export type Context = 'finished' | 'left' | 'home';

export const isQuick = (p: Puzzle) => !!p.type?.is_quick;

/**
 * Pick what to play next, from what this phone has done. Never suggests a completed puzzle.
 * 1. a puzzle started but not finished (not after leaving one early — that one was just left)
 * 2. after leaving early: a quick puzzle
 * 3. after finishing: a puzzle of a type this phone has completed before
 * 4. the newest puzzle not yet played
 * `puzzles` should be live puzzles, newest first.
 */
export function suggest(puzzles: Puzzle[], ctx: Context, opts: { exclude?: string[]; limit?: number } = {}): Suggestion[] {
  const done = doneIds();
  const started = startedNumbers();
  const exclude = new Set(opts.exclude ?? []);
  const pool = puzzles.filter((p) => !done.has(p.id) && !exclude.has(p.id) && !p.sample);
  const doneTypes = new Set(puzzles.filter((p) => done.has(p.id)).map((p) => p.type_id));

  const out: Suggestion[] = [];
  const take = (list: Puzzle[], reason: Reason) => {
    for (const p of list) if (!out.some((s) => s.puzzle.id === p.id)) out.push({ puzzle: p, reason });
  };

  if (ctx !== 'left') take(pool.filter((p) => started.has(p.number)), 'resume');
  if (ctx === 'left') take(pool.filter((p) => isQuick(p) && !started.has(p.number)), 'quick');
  if (ctx === 'finished') take(pool.filter((p) => doneTypes.has(p.type_id) && !started.has(p.number)), 'liked');
  take(pool.filter((p) => !started.has(p.number)), 'new');
  if (ctx === 'left') take(pool, 'resume');

  return out.slice(0, opts.limit ?? 3);
}
