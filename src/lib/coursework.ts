import type { FileRef, StudentCourseWork } from "./types";

// Shared by client and server code: keep this file free of Node-only imports.

export const MAX_UPLOAD_MB = 10;

const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  md: "text/plain",
  csv: "text/csv",
  py: "text/plain",
  java: "text/plain",
  c: "text/plain",
  cpp: "text/plain",
  js: "text/plain",
  ts: "text/plain",
  ipynb: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  zip: "application/zip",
};

export const ACCEPT = Object.keys(FILE_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export function fileTypeFor(name: string): string | undefined {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? FILE_TYPES[name.slice(dot + 1).toLowerCase()] : undefined;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const fileUrl = (file: FileRef) => `/api/files/${file.id}`;

export type CourseDeadline = { id: string; title: string; course: string; due: string; kind: "assignment" | "quiz" };

export function openCourseDeadlines(work: StudentCourseWork): CourseDeadline[] {
  const assignments = work.assignments.filter((a) => !a.submission).map((a): CourseDeadline => ({ id: a.id, title: a.title, course: a.course, due: a.due, kind: "assignment" }));
  const quizzes = work.quizzes.filter((q) => q.due && !q.attempt).map((q): CourseDeadline => ({ id: q.id, title: q.title, course: q.course, due: q.due!, kind: "quiz" }));
  return [...assignments, ...quizzes].sort((a, b) => a.due.localeCompare(b.due));
}
