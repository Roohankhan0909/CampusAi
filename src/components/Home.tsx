"use client";

import { campusEntries } from "@/lib/campus-data";
import { DAYS, KEYS, dueStatus, formatDateTime, relativeTime, seedAssignments, seedClasses, sortByDue, toLocalDate } from "@/lib/planner";
import type { Assignment, ClassSession } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";
import type { Tab } from "./Dashboard";
import StatusBadge from "./StatusBadge";

export default function Home({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [classes] = useLocalStorage<ClassSession[]>(KEYS.classes, seedClasses);
  const [assignments, setAssignments] = useLocalStorage<Assignment[]>(KEYS.assignments, seedAssignments);
  const [name, setName] = useLocalStorage<string>(KEYS.name, "");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = now.getDay();
  const todaysClasses = classes.filter((c) => c.day === today).sort((a, b) => a.start.localeCompare(b.start));
  const pending = sortByDue(assignments.filter((a) => !a.done));
  const weekAhead = now.getTime() + 7 * 86400000;
  const dueThisWeek = pending.filter((a) => new Date(a.due).getTime() <= weekAhead).length;
  const overdue = pending.filter((a) => dueStatus(a) === "overdue").length;
  const completion = assignments.length ? Math.round((assignments.filter((a) => a.done).length / assignments.length) * 100) : 0;
  const todayStr = toLocalDate(now);
  const events = campusEntries
    .filter((e) => e.category === "event" && e.date && e.date >= todayStr)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 3);

  const toggle = (id: string) => setAssignments((list) => list.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));

  const stats = [
    { label: "Classes today", value: todaysClasses.length },
    { label: "Due this week", value: dueThisWeek },
    { label: "Overdue", value: overdue, warn: overdue > 0 },
    { label: "Completed", value: `${completion}%` },
  ];

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-indigo-100">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h2 className="mt-1 text-2xl font-bold">
            {greeting}
            {name ? `, ${name}` : ""}!
          </h2>
          {!name && (
            <input
              placeholder="What should I call you?"
              onKeyDown={(e) => {
                if (e.key === "Enter") setName(e.currentTarget.value.trim());
              }}
              className="mt-3 w-64 rounded-xl bg-white/15 px-3 py-2 text-sm text-white placeholder:text-indigo-100 outline-none focus:bg-white/25"
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate("study")} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
            Ask the study assistant
          </button>
          <button onClick={() => onNavigate("planner")} className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25">
            Add a deadline
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.warn ? "text-red-600" : ""}`}>{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <h3 className="section-title mb-3">Today · {DAYS[today]}</h3>
          {todaysClasses.length === 0 ? (
            <p className="text-sm text-slate-500">No classes today.</p>
          ) : (
            <ul className="space-y-3">
              {todaysClasses.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span className="w-24 shrink-0 text-xs font-medium text-indigo-600">
                    {c.start}–{c.end}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{c.course}</p>
                    <p className="text-xs text-slate-500">{c.location}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">Upcoming deadlines</h3>
            <button onClick={() => onNavigate("planner")} className="text-xs font-medium text-indigo-600 hover:underline">
              View all
            </button>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-slate-500">All caught up!</p>
          ) : (
            <ul className="space-y-3">
              {pending.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <input type="checkbox" checked={a.done} onChange={() => toggle(a.id)} className="mt-1 h-4 w-4 accent-indigo-600" aria-label={`Mark ${a.title} done`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-slate-500" title={formatDateTime(a.due)}>
                      {a.course} · {relativeTime(a.due)}
                    </p>
                  </div>
                  <StatusBadge status={dueStatus(a)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">Campus events</h3>
            <button onClick={() => onNavigate("campus")} className="text-xs font-medium text-indigo-600 hover:underline">
              Campus helper
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming events.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.title} className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <span className="text-[10px] font-semibold uppercase">{new Date(`${e.date}T00:00`).toLocaleDateString(undefined, { month: "short" })}</span>
                    <span className="text-sm font-bold leading-none">{e.date!.slice(8)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="line-clamp-2 text-xs text-slate-500">{e.details}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
