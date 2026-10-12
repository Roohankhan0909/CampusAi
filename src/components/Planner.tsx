"use client";

import { FormEvent, useState } from "react";
import { DAYS, KEYS, WEEK_ORDER, dueStatus, formatDateTime, newId, relativeTime, seedAssignments, seedClasses, sortByDue } from "@/lib/planner";
import type { Assignment, ClassSession, Priority } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";
import StatusBadge from "./StatusBadge";

const PRIORITY_DOT: Record<Priority, string> = { low: "bg-slate-300", medium: "bg-amber-400", high: "bg-red-500" };

export default function Planner() {
  return (
    <div className="space-y-6">
      <Assignments />
      <Timetable />
    </div>
  );
}

function Assignments() {
  const [assignments, setAssignments] = useLocalStorage<Assignment[]>(KEYS.assignments, seedAssignments);
  const [reminders, setReminders] = useLocalStorage<boolean>(KEYS.reminders, false);
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [form, setForm] = useState({ title: "", course: "", due: "", priority: "medium" as Priority });

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.due) return;
    setAssignments((list) => [...list, { id: newId(), title: form.title.trim(), course: form.course.trim(), due: form.due, priority: form.priority, done: false }]);
    setForm({ title: "", course: form.course, due: "", priority: "medium" });
  };

  const enableReminders = async () => {
    if (typeof Notification === "undefined") return alert("Notifications aren't supported in this browser.");
    const permission = await Notification.requestPermission();
    setReminders(permission === "granted");
  };

  const shown = sortByDue(assignments).filter((a) => filter === "all" || (filter === "done" ? a.done : !a.done));
  const urgent = assignments.filter((a) => ["overdue", "soon"].includes(dueStatus(a)));

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="section-title">Assignments & deadlines</h3>
        <button onClick={reminders ? () => setReminders(false) : enableReminders} className="btn-ghost text-xs">
          {reminders ? "Reminders on (click to turn off)" : "Enable deadline reminders"}
        </button>
      </div>

      {urgent.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {urgent.length} assignment{urgent.length > 1 ? "s" : ""} need attention: {urgent.map((a) => a.title).join(", ")}
        </div>
      )}

      <form onSubmit={add} className="mb-4 grid gap-2 md:grid-cols-[2fr_1fr_1.3fr_1fr_auto]">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Assignment title" className="input" aria-label="Assignment title" required />
        <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Course" className="input" aria-label="Course" />
        <input type="datetime-local" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className="input" aria-label="Due date" required />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="input" aria-label="Priority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>

      <div className="mb-3 flex gap-2">
        {(["pending", "done", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === f ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-slate-100">
        {shown.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <input
              type="checkbox"
              checked={a.done}
              onChange={() => setAssignments((list) => list.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)))}
              className="h-4 w-4 accent-indigo-600"
              aria-label={`Mark ${a.title} done`}
            />
            <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[a.priority]}`} title={`${a.priority} priority`} />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${a.done ? "text-slate-400 line-through" : ""}`}>{a.title}</p>
              <p className="text-xs text-slate-500">
                {a.course && `${a.course} · `}
                {formatDateTime(a.due)} ({relativeTime(a.due)})
              </p>
            </div>
            <StatusBadge status={dueStatus(a)} />
            <button onClick={() => setAssignments((list) => list.filter((x) => x.id !== a.id))} className="text-xs text-slate-400 hover:text-red-600" aria-label={`Delete ${a.title}`}>
              Delete
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="py-3 text-sm text-slate-400">Nothing here.</li>}
      </ul>
    </section>
  );
}

function Timetable() {
  const [classes, setClasses] = useLocalStorage<ClassSession[]>(KEYS.classes, seedClasses);
  const [form, setForm] = useState({ course: "", day: 1, start: "09:00", end: "10:00", location: "" });
  const today = new Date().getDay();

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!form.course.trim() || form.end <= form.start) return;
    setClasses((list) => [...list, { id: newId(), ...form, course: form.course.trim(), location: form.location.trim() }]);
    setForm({ ...form, course: "", location: "" });
  };

  return (
    <section className="card p-5">
      <h3 className="section-title mb-4">Weekly timetable</h3>
      <form onSubmit={add} className="mb-5 grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto]">
        <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Course" className="input" aria-label="Class course" required />
        <select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })} className="input" aria-label="Day">
          {WEEK_ORDER.map((d) => (
            <option key={d} value={d}>
              {DAYS[d]}
            </option>
          ))}
        </select>
        <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="input" aria-label="Start time" />
        <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="input" aria-label="End time" />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="input" aria-label="Location" />
        <button type="submit" className="btn-primary">
          Add class
        </button>
      </form>
      {form.end <= form.start && <p className="-mt-3 mb-4 text-xs text-red-600">End time must be after start time.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {WEEK_ORDER.map((d) => {
          const dayClasses = classes.filter((c) => c.day === d).sort((a, b) => a.start.localeCompare(b.start));
          return (
            <div key={d} className={`rounded-xl border p-3 ${d === today ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200"}`}>
              <p className={`mb-2 text-xs font-semibold uppercase ${d === today ? "text-indigo-700" : "text-slate-500"}`}>
                {DAYS[d].slice(0, 3)}
                {d === today && " · Today"}
              </p>
              <div className="space-y-2">
                {dayClasses.map((c) => (
                  <div key={c.id} className="group rounded-lg bg-white p-2 text-xs shadow-sm ring-1 ring-slate-100">
                    <div className="flex justify-between gap-1">
                      <span className="font-medium text-indigo-600">
                        {c.start}–{c.end}
                      </span>
                      <button onClick={() => setClasses((list) => list.filter((x) => x.id !== c.id))} className="text-slate-300 hover:text-red-600" aria-label={`Remove ${c.course}`}>
                        ×
                      </button>
                    </div>
                    <p className="mt-0.5 font-medium text-slate-800">{c.course}</p>
                    {c.location && <p className="text-slate-500">{c.location}</p>}
                  </div>
                ))}
                {dayClasses.length === 0 && <p className="text-xs text-slate-300">Free</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
