"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, homeFor } from "@/lib/auth";
import { newUser, readDb, updateDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { parseCourses } from "@/lib/courses";
import type { FormState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = (await readDb()).users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await createSession(user.id);
  redirect(homeFor(user.role));
}

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (name.length < 2) return { error: "Please enter your name." };
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const passwordHash = await hashPassword(password);
  const user = await updateDb((db) => {
    if (db.users.some((u) => u.email === email)) return null;
    const created = newUser(name, email, passwordHash, "student", { courses: parseCourses(field(formData, "courses")) });
    db.users.push(created);
    return created;
  });
  if (!user) return { error: "An account with this email already exists." };

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
