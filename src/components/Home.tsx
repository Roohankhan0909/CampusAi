"use client";

import { DAYS, KEYS, dueStatus, formatDateTime, relativeTime, seedAssignments, seedClasses, sortByDue, toLocalDate } from "@/lib/planner";
import type { Announcement, Assignment, ClassSession, PublicUser, StoredCampusEntry } from "@/lib/types";
import { StreakContext, markStudied } from "@/lib/activity";
import { useContext } from "react";
import { CourseDeadlines } from "@/lib/usePlannerSnapshot";
import { useLocalStorage } from "@/lib/useLocalStorage";
import type { Tab } from "./Dashboard";
import Avatar from "./Avatar";
import StatusBadge from "./StatusBadge";

export default function Home({ user, campus, teachers, announcements, onNavigate }: { user: PublicUser; campus: StoredCampusEntry[]; teachers: PublicUser[]; announcements: Announcement[]; onNavigate: (tab: Tab) => void }) {
  const [classes] = useLocalStorage<ClassSession[]>(KEYS.classes, seedClasses);
  const [assignments, setAssignments] = useLocalStorage<Assignment[]>(KEYS.assignments, seedAssignments);
  const courseDeadlines = useContext(CourseDeadlines);
  const streaks = useContext(StreakContext);
  const name = user.name.split(" ")[0];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = now.getDay();
  const todaysClasses = classes.filter((c) => c.day === today).sort((a, b) => a.start.localeCompare(b.start));
  const pending = sortByDue(assignments.filter((a) => !a.done));
  const weekAhead = now.getTime() + 7 * 86400000;
  const fromCourses = courseDeadlines.map((d): Assignment => ({ id: d.id, title: d.kind === "quiz" ? `Quiz: ${d.title}` : d.kind === "plan" ? `Plan: ${d.title}` : d.title, course: d.course, due: d.due, priority: "high", done: false }));
  const courseIds = new Set(fromCourses.map((a) => a.id));
  const upcoming = sortByDue([...pending, ...fromCourses]);
  const dueThisWeek = upcoming.filter((a) => new Date(a.due).getTime() <= weekAhead).length;
  const overdue = upcoming.filter((a) => dueStatus(a) === "overdue").length;
  const completion = assignments.length ? Math.round((assignments.filter((a) => a.done).length / assignments.length) * 100) : 0;
  const todayStr = toLocalDate(now);
  const events = campus
    .filter((e) => e.category === "event" && e.date && e.date >= todayStr)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .slice(0, 3);

  const toggle = (id: string) => {
    if (assignments.some((a) => a.id === id && !a.done)) markStudied();
    setAssignments((list) => list.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));
  };

  const stats = [
    { label: "Classes today", value: todaysClasses.length },
    { label: "Due this week", value: dueThisWeek },
    { label: "Overdue", value: overdue, warn: overdue > 0 },
    { label: "Completed", value: `${completion}%` },
  ];

  return (
    <div className="space-y-6">
      <section className="card relative flex flex-col gap-4 overflow-hidden border-indigo-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-600" />
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-indigo-500 uppercase">{now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h2 className="mt-1 text-3xl font-semibold">
            {greeting}
            {name ? `, ${name}` : ""}!
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate("study")} className="btn-primary">
            Ask the study assistant
          </button>
          <button onClick={() => onNavigate("planner")} className="btn-ghost">
            Plan my week with AI
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
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">All caught up!</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  {courseIds.has(a.id) ? (
                    <button onClick={() => onNavigate("courses")} className="mt-0.5 shrink-0 rounded border border-indigo-400 px-1 text-[10px] font-semibold text-indigo-700 uppercase" title="Posted by your teacher">
                      Open
                    </button>
                  ) : (
                    <input type="checkbox" checked={a.done} onChange={() => toggle(a.id)} className="mt-1 h-4 w-4 accent-indigo-600" aria-label={`Mark ${a.title} done`} />
                  )}
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
                <li key={e.id} className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <span className="text-[10px] font-semibold uppercase">{new Date(`${e.date}T00:00`).toLocaleDateString(undefined, { month: "short" })}</span>
                    <span className="text-sm font-bold leading-none">{e.date!.slice(8)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="line-clamp-2 text-xs text-slate-500">{e.details}</p>
                    {e.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/${e.image.id}`} alt={e.title} loading="lazy" className="mt-2 h-24 w-full rounded-lg object-cover" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">Streaks</h3>
            <button onClick={() => onNavigate("progress")} className="text-xs font-medium text-indigo-600 hover:underline">
              My progress
            </button>
          </div>
          {streaks ? (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-3xl font-semibold text-indigo-600">{streaks.study.current}</p>
                <p className="text-xs text-slate-500">day study streak</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-3xl font-semibold">{streaks.open.current}</p>
                <p className="text-xs text-slate-500">day open streak</p>
              </div>
              <p className="col-span-2 text-xs text-slate-500">
                Best study streak {streaks.study.best} · studied on {streaks.study.total} day{streaks.study.total === 1 ? "" : "s"}
                {streaks.open.first ? ` since ${new Date(`${streaks.open.first}T00:00`).toLocaleDateString()}` : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">Announcements</h3>
            {announcements.length > 0 && (
              <button onClick={() => onNavigate("courses")} className="text-xs font-medium text-indigo-600 hover:underline">
                My courses
              </button>
            )}
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements from your teachers.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.slice(0, 3).map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="font-medium">
                    <span className="mr-2 text-[11px] font-semibold text-indigo-600">{a.course}</span>
                    {a.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-slate-500">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="section-title">My teachers</h3>
          <a href="/profile" className="text-xs font-medium text-indigo-600 hover:underline">
            {user.courses.length ? "Edit my courses" : "Add my courses"}
          </a>
        </div>
        {user.courses.length === 0 ? (
          <p className="text-sm text-slate-500">Add the courses you&apos;re enrolled in on your profile to see your teachers here.</p>
        ) : teachers.length === 0 ? (
          <p className="text-sm text-slate-500">No teachers found yet for {user.courses.join(", ")}.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((t) => (
              <li key={t.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <Avatar name={t.name} color={t.avatarColor} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{t.name}</p>
                  {t.department && <p className="text-xs text-slate-500">{t.department}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.courses
                      .filter((c) => user.courses.includes(c))
                      .map((c) => (
                        <span key={c} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          {c}
                        </span>
                      ))}
                  </div>
                  {t.officeHours && <p className="mt-1 text-xs text-slate-500">Office hours: {t.officeHours}</p>}
                  <a href={`mailto:${t.email}`} className="mt-1 block truncate text-xs text-indigo-600 hover:underline">
                    {t.email}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
