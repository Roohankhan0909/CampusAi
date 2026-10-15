import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readDb, toPublicUser } from "./db";
import type { PublicUser, Role } from "./types";

const COOKIE = "campusai_session";
const MAX_AGE = 7 * 24 * 3600;

async function getSecret(): Promise<string> {
  return process.env.AUTH_SECRET || (await readDb()).secret;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createSession(userId: string) {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${userId}.${exp}`;
  const token = `${payload}.${sign(payload, await getSecret())}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [userId, exp, sig] = token.split(".");
  if (!userId || !exp || !sig || Number(exp) < Date.now()) return null;
  const expected = Buffer.from(sign(`${userId}.${exp}`, await getSecret()));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  const user = (await readDb()).users.find((u) => u.id === userId);
  return user ? toPublicUser(user) : null;
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/";
}

export async function requireRole(...roles: Role[]): Promise<PublicUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  return requireRole("admin");
}
