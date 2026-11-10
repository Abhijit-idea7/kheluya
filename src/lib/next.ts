// "What should the big button play?" — one place that decides, from what this phone has done.
import type { Puzzle } from '@/lib/types';
import { doneAt, startedNumbers, touchedAt } from '@/lib/progress';
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
  /** a puzzle half-done on this phone and played today (today's main first) */
  resume: Puzzle | null;
  /** a half-done puzzle from an earlier day: offered quietly, never the big button */
  older: Puzzle | null;
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
  // Only a puzzle played TODAY takes over the big button; yesterday's unfinished one must not block today's.
  const touched = touchedAt();
  const playedToday = (p: Puzzle) => !!touched[String(p.number)] && istDay(touched[String(p.number)]) === today;
  const resume = (main && half.includes(main) && (main.live_date === today || playedToday(main)) ? main : half.find(playedToday)) ?? null;
  const older =
    half
      .filter((p) => p !== resume)
      .sort((a, b) => (touched[String(b.number)] ?? 0) - (touched[String(a.number)] ?? 0))[0] ?? null;

  const unplayedDaily = dailies.find((p) => !isDone(p) && p.id !== main?.id) ?? null;
  const next =
    resume ?? (main && !mainDone ? main : null) ?? (!quickDone && quickNext ? quickNext : null) ?? unplayedDaily ?? quickNext ?? null;
  const state: TodayPlan['state'] = resume ? 'resume' : main && !mainDone ? 'fresh' : !quickDone && quickNext ? 'quick' : 'done';
  return { main, mainIsToday: main?.live_date === today, mainDone, quick, quickDone, resume, older, next, state };
}

/**
 * After finishing `currentId`: the puzzle to start next.
 * 1 another half-done puzzle played today · 2 today's main · 3 a quick one not yet played · 4 newest daily not played
 * After giving up (`easy`): a quick one first.
 */
export function nextAfter(puzzles: Puzzle[], currentId: string, easy = false): Puzzle | null {
  const today = istToday();
  const done = doneAt();
  const started = startedNumbers();
  const touched = touchedAt();
  const playedToday = (p: Puzzle) => !!touched[String(p.number)] && istDay(touched[String(p.number)]) === today;
  const pool = puzzles.filter((p) => !p.sample && p.id !== currentId && !done[p.id]);
  const quicks = [...pool.filter(isQuick)].reverse();
  const dailies = pool.filter((p) => !isQuick(p));
  if (easy) return quicks[0] ?? dailies[0] ?? null;
  return (
    pool.find((p) => started.has(p.number) && playedToday(p)) ??
    dailies.find((p) => p.live_date === today) ??
    quicks[0] ??
    dailies[0] ??
    null
  );
}
