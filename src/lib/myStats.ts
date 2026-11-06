// The player's own numbers, worked out from what this phone has stored. No sign-in.
import type { Puzzle, PuzzleType } from '@/lib/types';
import { doneAt } from '@/lib/progress';
import { addDays, istToday, mondayOf } from '@/lib/dates';
import { istDay } from '@/lib/next';

const MILESTONES = [5, 10, 25, 50, 100, 200, 365, 500, 1000];

export type MyStats = {
  solved: number;
  streak: number;
  /** Monday→Sunday of this week: played that day? */
  week: { date: string; played: boolean; today: boolean }[];
  weekDays: number;
  /** sum of this phone's solving times, ms */
  totalMs: number;
  kinds: number;
  favourites: { type: PuzzleType; n: number }[];
  milestone: { target: number; left: number; pct: number };
  /** the most recent finished puzzle with a saved time */
  lastTimed: { puzzle: Puzzle; ms: number } | null;
};

function readTimes(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('ck-my-times') || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

export function myStats(puzzles: Puzzle[]): MyStats {
  const done = doneAt();
  const times = readTimes();
  const ids = Object.keys(done);
  const days = new Set(ids.map((id) => istDay(done[id])));
  const today = istToday();

  let d = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(d)) {
    streak++;
    d = addDays(d, -1);
  }

  const mon = mondayOf(today);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(mon, i);
    return { date, played: days.has(date), today: date === today };
  });

  const byId = new Map(puzzles.map((p) => [p.id, p]));
  const counts = new Map<string, { type: PuzzleType; n: number }>();
  for (const id of ids) {
    const t = byId.get(id)?.type;
    if (!t) continue;
    const c = counts.get(t.id) ?? { type: t, n: 0 };
    c.n++;
    counts.set(t.id, c);
  }
  const favourites = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 3);

  const solved = ids.length;
  const target = MILESTONES.find((m) => m > solved) ?? solved + 100;
  const prev = [...MILESTONES].reverse().find((m) => m <= solved) ?? 0;
  const pct = Math.round(((solved - prev) / Math.max(1, target - prev)) * 100);

  const timed = ids
    .filter((id) => times[id] > 0 && byId.get(id))
    .sort((a, b) => done[b] - done[a]);
  const lastTimed = timed.length ? { puzzle: byId.get(timed[0])!, ms: times[timed[0]] } : null;

  return {
    solved,
    streak,
    week,
    weekDays: week.filter((w) => w.played).length,
    totalMs: ids.reduce((s, id) => s + (times[id] > 0 ? times[id] : 0), 0),
    kinds: counts.size,
    favourites,
    milestone: { target, left: target - solved, pct },
    lastTimed,
  };
}
