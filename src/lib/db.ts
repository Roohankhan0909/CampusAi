import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { campusEntries } from "./campus-data";
import { hashPassword } from "./password";
import type { PublicUser, Role, StoredCampusEntry } from "./types";

// Simple JSON-file store for local use. Swap for a real database before deploying to serverless hosts.

export type User = PublicUser & { passwordHash: string };

type Db = {
  secret: string;
  users: User[];
  campus: StoredCampusEntry[];
};

const DB_PATH = process.env.CAMPUSAI_DB_PATH || path.join(process.cwd(), "data", "db.json");

export const DEFAULT_ADMIN_EMAIL = "admin@campusai.edu";
export const DEFAULT_ADMIN_PASSWORD = "admin12345";

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function save(db: Db) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_PATH);
}

async function seed(): Promise<Db> {
  const admin: User = {
    id: crypto.randomUUID(),
    name: "Admin",
    email: (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase(),
    passwordHash: await hashPassword(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD),
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  return {
    secret: crypto.randomBytes(32).toString("hex"),
    users: [admin],
    campus: campusEntries.map((e) => ({ ...e, id: crypto.randomUUID() })),
  };
}

async function load(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8")) as Db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = await seed();
    await save(db);
    return db;
  }
}

export function readDb(): Promise<Db> {
  return withLock(load);
}

export function updateDb<T>(fn: (db: Db) => T): Promise<T> {
  return withLock(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
}

export function toPublicUser({ id, name, email, role, createdAt }: User): PublicUser {
  return { id, name, email, role, createdAt };
}

export function newUser(name: string, email: string, passwordHash: string, role: Role = "student"): User {
  return { id: crypto.randomUUID(), name, email, passwordHash, role, createdAt: new Date().toISOString() };
}
