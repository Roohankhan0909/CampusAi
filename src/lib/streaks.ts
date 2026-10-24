import type { ActivityDay, StreakSummary, Streaks } from "./types";

const DAY = 86400000;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const toTime = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10);
export const todayIso = () => isoDate(Date.now());

// A streak stays alive until a full day is missed: if today isn't active yet, counting starts from yesterday.
export function summarize(dates: string[], today: string): StreakSummary {
  const set = new Set(dates);
  const sorted = [...set].sort();
  if (!sorted.length) return { current: 0, best: 0, total: 0 };
  let best = 0;
  let run = 0;
  let prev = -Infinity;
  for (const d of sorted) {
    const t = toTime(d);
    run = t - prev === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  let t = toTime(today) - (set.has(today) ? 0 : DAY);
  let current = 0;
  while (set.has(isoDate(t))) {
    current++;
    t -= DAY;
  }
  return { current, since: current ? isoDate(t + DAY) : undefined, best, total: set.size, first: sorted[0] };
}

// Without an explicit day (teacher views), use the student's own latest day when it is one day ahead of
// the server's UTC date, so students east of UTC aren't shown a broken streak after their local midnight.
export function streaksFor(activity: ActivityDay[], userId: string, day?: string): Streaks {
  const mine = activity.filter((a) => a.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
  const server = todayIso();
  const latest = mine.at(-1)?.date;
  const today = day ?? (latest && latest > server && toTime(latest) - toTime(server) <= DAY ? latest : server);
  return {
    open: summarize(mine.filter((d) => d.opened).map((d) => d.date), today),
    study: summarize(mine.filter((d) => d.studied).map((d) => d.date), today),
    days: mine.map(({ date, opened, studied }) => ({ date, opened, studied })),
  };
}
