"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseCourses } from "@/lib/courses";
import { AVATAR_COLORS, updateDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { FormState } from "@/lib/types";

const field = (formData: FormData, name: string, max = 500) => String(formData.get(name) ?? "").trim().slice(0, max);

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const name = field(formData, "name", 80);
  const color = field(formData, "avatarColor", 20);
  if (name.length < 2) return { error: "Please enter your name." };

  await updateDb((db) => {
    const user = db.users.find((u) => u.id === me.id);
    if (!user) return;
    user.name = name;
    user.department = field(formData, "department", 100);
    user.bio = field(formData, "bio", 1000);
    user.courses = parseCourses(field(formData, "courses", 500));
    user.avatarColor = AVATAR_COLORS.includes(color) ? color : "indigo";
    if (me.role !== "student") user.officeHours = field(formData, "officeHours", 200);
  });
  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const hash = await hashPassword(next);
  const result = await updateDb(async (db) => {
    const user = db.users.find((u) => u.id === me.id);
    if (!user) return "missing";
    if (!(await verifyPassword(current, user.passwordHash))) return "wrong";
    user.passwordHash = hash;
    return "ok";
  });
  if (result === "wrong") return { error: "Current password is incorrect." };
  if (result !== "ok") return { error: "Account not found." };
  return { success: "Password changed." };
}
