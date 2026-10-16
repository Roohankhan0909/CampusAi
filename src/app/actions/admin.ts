"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { parseCourses } from "@/lib/courses";
import { newUser, updateDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { deleteUserData } from "@/lib/userData";
import type { CampusCategory, FormState, Role } from "@/lib/types";

const CATEGORIES: CampusCategory[] = ["course", "event", "facility", "faq"];
const ROLES: Role[] = ["student", "teacher", "admin"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field = (formData: FormData, name: string, max = 500) => String(formData.get(name) ?? "").trim().slice(0, max);

export async function createUser(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const name = field(formData, "name", 80);
  const email = field(formData, "email", 200).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = field(formData, "role") as Role;
  if (name.length < 2) return { error: "Please enter a name." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };
  if (!ROLES.includes(role)) return { error: "Choose a role." };

  const passwordHash = await hashPassword(password);
  const created = await updateDb((db) => {
    if (db.users.some((u) => u.email === email)) return false;
    db.users.push(
      newUser(name, email, passwordHash, role, {
        department: field(formData, "department", 100),
        courses: parseCourses(field(formData, "courses")),
        officeHours: field(formData, "officeHours", 200),
      }),
    );
    return true;
  });
  if (!created) return { error: "An account with this email already exists." };
  revalidatePath("/admin");
  return { success: `${name} added as ${role}.` };
}

export async function updateUserDetails(userId: string, details: { department: string; courses: string; officeHours: string }) {
  await requireAdmin();
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return;
    user.department = String(details.department ?? "").trim().slice(0, 100);
    user.courses = parseCourses(String(details.courses ?? "").slice(0, 500));
    user.officeHours = String(details.officeHours ?? "").trim().slice(0, 200);
  });
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: Role) {
  const admin = await requireAdmin();
  if (userId === admin.id || !ROLES.includes(role)) return;
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user) user.role = role;
  });
  revalidatePath("/admin");
}

export async function approveUser(userId: string) {
  await requireAdmin();
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user) user.status = "active";
  });
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;
  await updateDb((db) => {
    db.users = db.users.filter((u) => u.id !== userId);
  });
  await deleteUserData(userId);
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
