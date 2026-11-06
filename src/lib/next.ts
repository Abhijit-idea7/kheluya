// "What should the big button play?" — one place that decides, from what this phone has done.
import type { Puzzle } from '@/lib/types';
import { doneAt, startedNumbers } from '@/lib/progress';
import { istToday } from '@/lib/dates';
import { isQuick } from '@/lib/suggest';

export const istDay = (ms: number) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);

export type TodayPlan = {
  /** today's daily puzzle (or the newest one if none is set for today) */
  main: Puzzle | null;
  mainIsToday: boolean;
  mainDone: boolean;
  /** a quick puzzle finished today, else the next quick one not yet played */
  quick: Puzzle | null;
  quickDone: boolean;
  /** a puzzle started on this phone and not finished (today's main first) */
  resume: Puzzle | null;
  /** what the big button plays */
  next: Puzzle | null;
  state: 'resume' | 'fresh' | 'quick' | 'done';
};

/** `puzzles`: live puzzles, newest first. */
export function todayPlan(puzzles: Puzzle[]): TodayPlan {
  const today = istToday();
  const done = doneAt();
  const started = startedNumbers();
  const real = puzzles.filter((p) => !p.sample);
  const dailies = real.filter((p) => !isQuick(p));
  const quicks = real.filter(isQuick);
  const isDone = (p: Puzzle) => !!done[p.id];

  const main = dailies.find((p) => p.live_date === today) ?? dailies[0] ?? null;
  const mainDone = !!main && isDone(main);
  const quickToday = quicks.find((p) => done[p.id] && istDay(done[p.id]) === today) ?? null;
  // Oldest quick puzzle first, so everyone meets them in the same easy order
  const quickNext = [...quicks].reverse().find((p) => !isDone(p)) ?? null;
  const quick = quickToday ?? quickNext;
  const quickDone = !!quickToday;
  const half = real.filter((p) => started.has(p.number) && !isDone(p));
  const resume = (main && half.includes(main) ? main : half[0]) ?? null;

  const unplayedDaily = dailies.find((p) => !isDone(p) && p.id !== main?.id) ?? null;
  const next =
    resume ?? (main && !mainDone ? main : null) ?? (!quickDone && quickNext ? quickNext : null) ?? unplayedDaily ?? quickNext ?? null;
  const state: TodayPlan['state'] = resume ? 'resume' : main && !mainDone ? 'fresh' : !quickDone && quickNext ? 'quick' : 'done';
  return { main, mainIsToday: main?.live_date === today, mainDone, quick, quickDone, resume, next, state };
}

/**
 * After finishing `currentId`: the puzzle to start next.
 * 1 another half-done puzzle · 2 today's main · 3 a quick one not yet played · 4 newest daily not played
 * After giving up (`easy`): a quick one first.
 */
export function nextAfter(puzzles: Puzzle[], currentId: string, easy = false): Puzzle | null {
  const today = istToday();
  const done = doneAt();
  const started = startedNumbers();
  const pool = puzzles.filter((p) => !p.sample && p.id !== currentId && !done[p.id]);
  const quicks = [...pool.filter(isQuick)].reverse();
  const dailies = pool.filter((p) => !isQuick(p));
  if (easy) return quicks[0] ?? dailies[0] ?? null;
  return (
    pool.find((p) => started.has(p.number)) ??
    dailies.find((p) => p.live_date === today) ??
    quicks[0] ??
    dailies[0] ??
    null
  );
}
