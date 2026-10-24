import type { StreakSummary, Streaks } from "@/lib/types";

const WEEKS = 12;
const fmt = (d?: string) => (d ? new Date(`${d}T00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Stat({ title, s, hint }: { title: string; s: StreakSummary; hint: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium tracking-[0.14em] text-slate-500 uppercase">{title}</p>
      <p className="mt-2 text-4xl font-semibold text-indigo-600">{plural(s.current, "day")}</p>
      <p className="mt-1 text-xs text-slate-500">{s.current ? `Since ${fmt(s.since)}` : hint}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 text-center text-xs">
        <div>
          <dt className="text-slate-500">Best</dt>
          <dd className="text-base font-semibold">{s.best}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Total days</dt>
          <dd className="text-base font-semibold">{s.total}</dd>
        </div>
        <div>
          <dt className="text-slate-500">First day</dt>
          <dd className="text-sm font-medium">{s.first ? fmt(s.first).replace(/, \d{4}$/, "") : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ActivityCalendar({ days }: { days: Streaks["days"] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - end.getDay() - (WEEKS - 1) * 7);
  const cells: { date: string; level: 0 | 1 | 2; future: boolean }[] = [];
  for (let d = new Date(start); cells.length < WEEKS * 7; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const a = byDate.get(key);
    cells.push({ date: key, level: a?.studied ? 2 : a?.opened ? 1 : 0, future: d > end });
  }
  const color = ["bg-slate-100", "bg-indigo-200", "bg-indigo-600"];
  return (
    <div>
      <div className="grid w-fit grid-flow-col grid-rows-7 gap-1" role="img" aria-label="Activity over the last 12 weeks">
        {cells.map((c) => (
          <span key={c.date} title={`${fmt(c.date)}: ${c.level === 2 ? "studied" : c.level === 1 ? "opened" : "no activity"}`} className={`h-3.5 w-3.5 rounded-sm ${c.future ? "opacity-0" : color[c.level]}`} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-slate-100" /> None</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-indigo-200" /> Opened</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-indigo-600" /> Studied</span>
      </div>
    </div>
  );
}

export function StreakBadge({ streaks }: { streaks?: Pick<Streaks, "open" | "study"> }) {
  if (!streaks) return null;
  return (
    <span className="text-xs text-slate-500" title={`Best study streak: ${streaks.study.best} · Days studied: ${streaks.study.total}`}>
      Study streak <b className="text-indigo-600">{streaks.study.current}</b> · Open streak <b className="text-slate-700">{streaks.open.current}</b>
    </span>
  );
}

export default function StreakView({ streaks }: { streaks: Streaks | null }) {
  if (!streaks) return <p className="text-sm text-slate-500">Loading your activity…</p>;
  const last30 = streaks.days.filter((d) => Date.now() - new Date(`${d.date}T00:00`).getTime() < 30 * 86400000);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Stat title="Open streak" s={streaks.open} hint="Open CampusAI tomorrow to start a streak." />
        <Stat title="Study streak" s={streaks.study} hint="Use the study assistant, flashcards or a quiz, finish a task, or submit work to count a study day." />
      </div>
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="section-title">Last 12 weeks</h3>
          <p className="text-xs text-slate-500">
            Last 30 days: opened on {plural(last30.filter((d) => d.opened).length, "day")}, studied on {plural(last30.filter((d) => d.studied).length, "day")}
          </p>
        </div>
        <ActivityCalendar days={streaks.days} />
      </section>
      <section className="card p-5 text-sm text-slate-600">
        <h3 className="section-title mb-2">What counts as studying</h3>
        <p>Asking the study assistant, summarizing notes, reviewing flashcards, taking a quiz, ticking off a planner or study plan task, or submitting an assignment. Opening the app alone keeps your open streak going. Your teachers can see your streaks.</p>
      </section>
    </div>
  );
}
