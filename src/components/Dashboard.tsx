"use client";

import { useEffect, useState } from "react";
import type { AiMode, Assignment } from "@/lib/types";
import { KEYS, relativeTime } from "@/lib/planner";
import Icon, { type IconName } from "./Icon";
import Home from "./Home";
import StudyAssistant from "./StudyAssistant";
import CampusHelper from "./CampusHelper";
import Planner from "./Planner";

export type Tab = "home" | "study" | "campus" | "planner";

const NAV: { id: Tab; label: string; icon: IconName; subtitle: string }[] = [
  { id: "home", label: "Overview", icon: "home", subtitle: "Your day at a glance" },
  { id: "study", label: "Study Assistant", icon: "study", subtitle: "Chat, summarize notes, and quiz yourself" },
  { id: "campus", label: "Campus Helper", icon: "campus", subtitle: "Courses, events, and facilities" },
  { id: "planner", label: "Planner", icon: "planner", subtitle: "Timetable, assignments, and deadlines" },
];

function useDeadlineNotifications() {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem(KEYS.reminders) !== "true" || sessionStorage.getItem("campusai.notified")) return;
    const assignments: Assignment[] = JSON.parse(localStorage.getItem(KEYS.assignments) ?? "[]");
    const now = Date.now();
    assignments
      .filter((a) => !a.done && new Date(a.due).getTime() - now < 24 * 3600 * 1000 && new Date(a.due).getTime() > now)
      .forEach((a) => new Notification(`Due ${relativeTime(a.due)}: ${a.title}`, { body: a.course }));
    sessionStorage.setItem("campusai.notified", "1");
  }, []);
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setMode] = useState<AiMode | null>(null);
  useDeadlineNotifications();

  useEffect(() => {
    fetch("/api/ai")
      .then((r) => r.json())
      .then((d: { mode: AiMode }) => setMode(d.mode))
      .catch(() => setMode("offline"));
  }, []);

  const current = NAV.find((n) => n.id === tab)!;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Icon name="sparkle" />
          </div>
          <span className="text-lg font-bold">CampusAI</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                tab === n.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden p-4 md:block">
          {mode && (
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold">
                <span className={`h-2 w-2 rounded-full ${mode === "openai" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {mode === "openai" ? "AI: connected" : "AI: offline mode"}
              </div>
              {mode === "offline" && <p className="mt-1">Set OPENAI_API_KEY to enable full AI answers.</p>}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">{current.label}</h1>
          <p className="text-sm text-slate-500">{current.subtitle}</p>
        </header>
        {tab === "home" && <Home onNavigate={setTab} />}
        {tab === "study" && <StudyAssistant />}
        {tab === "campus" && <CampusHelper />}
        {tab === "planner" && <Planner />}
      </main>
    </div>
  );
}
