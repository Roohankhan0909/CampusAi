"use server";

import { getCurrentUser } from "@/lib/auth";
import { updateDb } from "@/lib/db";
import { DATE_RE, streaksFor, todayIso, toTime } from "@/lib/streaks";
import type { Streaks } from "@/lib/types";

// date is the user's local calendar day; anything more than ~2 days from server time falls back to the server's day.
export async function recordActivity(kind: "open" | "study", date: string): Promise<Streaks | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const day = DATE_RE.test(date) && Math.abs(toTime(date) - Date.now()) < 2 * 86400000 ? date : todayIso();
  const activity = await updateDb((db) => {
    const id = `${user.id}:${day}`;
    let row = db.activity.find((a) => a.id === id);
    if (!row) {
      row = { id, userId: user.id, date: day, opened: false, studied: false };
      db.activity.push(row);
    }
    row.opened = true;
    if (kind === "study") row.studied = true;
    return db.activity;
  });
  return streaksFor(activity, user.id, day);
}
