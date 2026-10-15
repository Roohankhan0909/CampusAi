"use client";

import { createContext, useCallback, useContext } from "react";
import type { CourseDeadline } from "./coursework";
import { KEYS, toLocalInput } from "./planner";
import type { Assignment, PlannerData } from "./types";

// Open assignments and quizzes posted by the student's teachers.
export const CourseDeadlines = createContext<CourseDeadline[]>([]);
import { useScopedKey } from "./useLocalStorage";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePlannerSnapshot() {
  const classesKey = useScopedKey(KEYS.classes);
  const assignmentsKey = useScopedKey(KEYS.assignments);
  const courseDeadlines = useContext(CourseDeadlines);
  return useCallback((): PlannerData => {
    const fromCourses = courseDeadlines.map(
      (d): Assignment => ({ id: d.id, title: d.kind === "quiz" ? `Quiz: ${d.title}` : d.title, course: d.course, due: d.due, priority: "high", done: false }),
    );
    return { classes: read(classesKey, []), assignments: [...read<Assignment[]>(assignmentsKey, []), ...fromCourses], now: toLocalInput(new Date()) };
  }, [classesKey, assignmentsKey, courseDeadlines]);
}
