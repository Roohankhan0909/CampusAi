"use client";

import { createContext } from "react";
import type { Streaks } from "./types";

export const STUDY_EVENT = "campusai:study";

// Call after any real study action (AI tutor, flashcards, quiz, finished task, submission).
export function markStudied() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STUDY_EVENT));
}

export const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const StreakContext = createContext<Streaks | null>(null);
