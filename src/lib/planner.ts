import type { Assignment, ClassSession } from "./types";

export const KEYS = {
  classes: "campusai.classes",
  assignments: "campusai.assignments",
  studyChat: "campusai.studyChat",
  campusChat: "campusai.campusChat",
  notes: "campusai.notes",
  reminders: "campusai.reminders",
};

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const newId = () => Math.random().toString(36).slice(2, 10);

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toLocalDate(date: Date): string {
  return toLocalInput(date).slice(0, 10);
}

function daysFromNow(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return toLocalInput(d);
}

export function seedClasses(): ClassSession[] {
  return [
    { id: newId(), course: "CS101 Intro to Programming", day: 1, start: "09:00", end: "10:30", location: "Engineering 204" },
    { id: newId(), course: "MATH201 Linear Algebra", day: 1, start: "13:00", end: "14:30", location: "Science Hall 110" },
    { id: newId(), course: "ENG150 Academic Writing", day: 2, start: "11:00", end: "12:30", location: "Humanities 3B" },
    { id: newId(), course: "CS101 Intro to Programming", day: 3, start: "09:00", end: "10:30", location: "Engineering 204" },
    { id: newId(), course: "PHY110 Physics I", day: 4, start: "10:00", end: "11:30", location: "Science Hall 220" },
    { id: newId(), course: "MATH201 Linear Algebra", day: 5, start: "13:00", end: "14:30", location: "Science Hall 110" },
  ];
}

export function seedAssignments(): Assignment[] {
  return [
    { id: newId(), title: "Problem Set 3", course: "MATH201", due: daysFromNow(1, 23), priority: "high", done: false },
    { id: newId(), title: "Lab 4: Loops & Functions", course: "CS101", due: daysFromNow(3, 17), priority: "medium", done: false },
    { id: newId(), title: "Essay draft: Argument analysis", course: "ENG150", due: daysFromNow(6, 9), priority: "medium", done: false },
    { id: newId(), title: "Reading: Chapter 5", course: "PHY110", due: daysFromNow(-1, 12), priority: "low", done: true },
  ];
}

export type DueStatus = "done" | "overdue" | "soon" | "upcoming";

export function dueStatus(a: Assignment, now = Date.now()): DueStatus {
  if (a.done) return "done";
  const diff = new Date(a.due).getTime() - now;
  if (diff < 0) return "overdue";
  if (diff < 48 * 3600 * 1000) return "soon";
  return "upcoming";
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const span = hours < 1 ? "less than an hour" : hours < 36 ? `${hours} hour${hours === 1 ? "" : "s"}` : `${days} days`;
  return diff >= 0 ? `in ${span}` : `${span} ago`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function sortByDue(list: Assignment[]): Assignment[] {
  return [...list].sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
}
