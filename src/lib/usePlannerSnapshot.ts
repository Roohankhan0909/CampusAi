"use client";

import { useCallback } from "react";
import { KEYS, toLocalInput } from "./planner";
import type { PlannerData } from "./types";
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
  return useCallback(
    (): PlannerData => ({ classes: read(classesKey, []), assignments: read(assignmentsKey, []), now: toLocalInput(new Date()) }),
    [classesKey, assignmentsKey],
  );
}
