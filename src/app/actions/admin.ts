"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateDb } from "@/lib/db";
import type { CampusCategory, FormState, Role } from "@/lib/types";

const CATEGORIES: CampusCategory[] = ["course", "event", "facility", "faq"];

export async function setUserRole(userId: string, role: Role) {
  const admin = await requireAdmin();
  if (userId === admin.id || !["student", "admin"].includes(role)) return;
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user) user.role = role;
  });
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;
  await updateDb((db) => {
    db.users = db.users.filter((u) => u.id !== userId);
  });
  revalidatePath("/admin");
}

export async function saveCampusEntry(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const category = String(formData.get("category") ?? "") as CampusCategory;
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (!CATEGORIES.includes(category)) return { error: "Choose a category." };
  if (!title || !details) return { error: "Title and details are required." };
  if (category === "event" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Events need a date." };

  const entry = { category, title, details, tags, ...(category === "event" ? { date } : {}) };
  const ok = await updateDb((db) => {
    if (!id) {
      db.campus.push({ id: crypto.randomUUID(), ...entry });
      return true;
    }
    const idx = db.campus.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    db.campus[idx] = { id, ...entry };
    return true;
  });
  if (!ok) return { error: "Entry not found." };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: id ? "Entry updated." : "Entry added." };
}

export async function deleteCampusEntry(id: string) {
  await requireAdmin();
  await updateDb((db) => {
    db.campus = db.campus.filter((e) => e.id !== id);
  });
  revalidatePath("/admin");
  revalidatePath("/");
}
