"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { logout } from "@/app/actions/auth";
import { openCourseDeadlines } from "@/lib/coursework";
import type { AiMode, Assignment, PublicationsView, PublicUser, StoredCampusEntry, Streaks, StudentCourseWork } from "@/lib/types";
import { recordActivity } from "@/app/actions/activity";
import { STUDY_EVENT, StreakContext, localDay } from "@/lib/activity";
import StreakView from "./progress/StreakView";
import Publications from "./progress/Publications";
import { KEYS, relativeTime } from "@/lib/planner";
import { CourseDeadlines } from "@/lib/usePlannerSnapshot";
import { StorageScope } from "@/lib/useLocalStorage";
import Avatar from "./Avatar";
import Icon, { type IconName } from "./Icon";
import Logo, { Wordmark } from "./Logo";
import Home from "./Home";
import StudyAssistant from "./StudyAssistant";
import CampusHelper from "./CampusHelper";
import Planner from "./Planner";
import StudentCourses from "./course/StudentCourses";

export type Tab = "home" | "courses" | "study" | "campus" | "planner" | "progress" | "publications";

const NAV: { id: Tab; label: string; icon: IconName; subtitle: string }[] = [
  { id: "home", label: "Overview", icon: "home", subtitle: "Your day at a glance" },
  { id: "courses", label: "My courses", icon: "courses", subtitle: "Materials, assignments, and quizzes from your teachers" },
  { id: "study", label: "Study Assistant", icon: "study", subtitle: "Chat, summarize notes, flashcards, and quizzes" },
  { id: "campus", label: "Campus Helper", icon: "campus", subtitle: "Courses, events, and facilities" },
  { id: "planner", label: "Planner", icon: "planner", subtitle: "AI study plan, assignments, and timetable" },
  { id: "progress", label: "My progress", icon: "sparkle", subtitle: "Your open and study streaks and activity history" },
  { id: "publications", label: "Publications", icon: "courses", subtitle: "Articles and research papers from across campus" },
];

function useStreaks(userId: string) {
  const [streaks, setStreaks] = useState<Streaks | null>(null);
  useEffect(() => {
    recordActivity("open", localDay()).then(setStreaks).catch(() => {});
    const key = `campusai.studied.${userId}`;
    const onStudy = () => {
      const day = localDay();
      if (localStorage.getItem(key) === day) return;
      localStorage.setItem(key, day);
      recordActivity("study", day)
        .then(setStreaks)
        .catch(() => localStorage.removeItem(key));
    };
    window.addEventListener(STUDY_EVENT, onStudy);
    return () => window.removeEventListener(STUDY_EVENT, onStudy);
  }, [userId]);
  return streaks;
}

function useDeadlineNotifications(userId: string) {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (localStorage.getItem(`${KEYS.reminders}.${userId}`) !== "true" || sessionStorage.getItem("campusai.notified")) return;
    const assignments: Assignment[] = JSON.parse(localStorage.getItem(`${KEYS.assignments}.${userId}`) ?? "[]");
    const now = Date.now();
    assignments
      .filter((a) => !a.done && new Date(a.due).getTime() - now < 24 * 3600 * 1000 && new Date(a.due).getTime() > now)
      .forEach((a) => new Notification(`Due ${relativeTime(a.due)}: ${a.title}`, { body: a.course }));
    sessionStorage.setItem("campusai.notified", "1");
  }, [userId]);
}

export default function Dashboard({ user, campus, teachers, work, publications }: { user: PublicUser; campus: StoredCampusEntry[]; teachers: PublicUser[]; work: StudentCourseWork; publications: PublicationsView }) {
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setMode] = useState<AiMode | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  useDeadlineNotifications(user.id);
  const streaks = useStreaks(user.id);

  useEffect(() => {
    fetch("/api/ai")
      .then((r) => r.json())
      .then((d: { mode: AiMode; provider: string | null }) => {
        setMode(d.mode);
        setProvider(d.provider);
      })
      .catch(() => setMode("offline"));
  }, []);

  const deadlines = useMemo(() => openCourseDeadlines(work), [work]);
  const nav = NAV.filter((n) => n.id !== "courses" || user.role === "student");
  const current = NAV.find((n) => n.id === tab)!;

  return (
    <StorageScope.Provider value={user.id}>
    <CourseDeadlines.Provider value={deadlines}>
    <StreakContext.Provider value={streaks}>
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-5 py-5">
          <Logo />
          <Wordmark />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                tab === n.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon name={n.icon} />
              {n.label}
              {n.id === "courses" && deadlines.length > 0 && (
                <span className="ml-auto rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-[#0a0a0a]">{deadlines.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 p-4">
          {user.role !== "student" && (
            <Link href={user.role === "admin" ? "/admin" : "/teacher"} className="btn-ghost flex items-center justify-center">
              {user.role === "admin" ? "Admin panel" : "Teacher portal"}
            </Link>
          )}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80" title="My profile">
            <Avatar name={user.name} color={user.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            </Link>
            <form action={logout}>
              <button className="text-xs font-medium text-slate-500 hover:text-red-600">Log out</button>
            </form>
          </div>
          {mode && (
            <div className="hidden rounded-xl bg-slate-50 p-3 text-xs text-slate-600 md:block">
              <div className="flex items-center gap-2 font-semibold">
                <span className={`h-2 w-2 rounded-full ${mode === "ai" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {mode === "ai" ? `AI: connected${provider ? ` (${provider})` : ""}` : "AI: offline mode"}
              </div>
              {mode === "offline" && <p className="mt-1">Set AI_API_KEY (free Groq or Gemini key) to enable full AI answers.</p>}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">{current.label}</h1>
          <p className="text-sm text-slate-500">{current.subtitle}</p>
        </header>
        {tab === "home" && <Home user={user} campus={campus} teachers={teachers} announcements={work.announcements} onNavigate={setTab} />}
        {tab === "courses" && <StudentCourses user={user} work={work} />}
        {tab === "study" && <StudyAssistant />}
        {tab === "campus" && <CampusHelper campus={campus} />}
        {tab === "planner" && <Planner />}
        {tab === "progress" && <StreakView streaks={streaks} />}
        {tab === "publications" && <Publications view={publications} />}
      </main>
    </div>
    </StreakContext.Provider>
    </CourseDeadlines.Provider>
    </StorageScope.Provider>
  );
}
