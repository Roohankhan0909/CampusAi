import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import postgres from "postgres";
import { campusEntries } from "./campus-data";
import { hashPassword } from "./password";
import type { ActivityDay, Announcement, CourseAssignment, CourseMaterial, CourseQuiz, Profile, Publication, PublicUser, QuizAttempt, Role, StoredCampusEntry, StudyPlan, Submission, UserStatus } from "./types";

// With SUPABASE_DB_URL (or DATABASE_URL) set, data lives in Postgres (e.g. Supabase); otherwise in a local JSON file for development.

export type User = Omit<PublicUser, keyof Profile | "status"> & Partial<Profile> & { passwordHash: string; status?: UserStatus };

export const AVATAR_COLORS = ["indigo", "violet", "emerald", "amber", "rose", "sky", "slate"];

export type Db = {
  secret: string;
  users: User[];
  campus: StoredCampusEntry[];
  materials: CourseMaterial[];
  assignments: CourseAssignment[];
  submissions: Submission[];
  quizzes: CourseQuiz[];
  quizAttempts: QuizAttempt[];
  announcements: Announcement[];
  plans: StudyPlan[];
  publications: Publication[];
  activity: ActivityDay[];
};

type Collection = Exclude<keyof Db, "secret">;
type Row = { id: string };

const TABLES: Record<Collection, string> = {
  users: "users",
  campus: "campus_entries",
  materials: "course_materials",
  assignments: "course_assignments",
  submissions: "assignment_submissions",
  quizzes: "course_quizzes",
  quizAttempts: "quiz_attempts",
  announcements: "course_announcements",
  plans: "study_plans",
  publications: "publications",
  activity: "activity_days",
};
const COLLECTIONS = Object.keys(TABLES) as Collection[];

export const DEFAULT_ADMIN_EMAIL = "admin@campusai.edu";
export const DEFAULT_ADMIN_PASSWORD = "admin12345";

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
    materials: [],
    assignments: [],
    submissions: [],
    quizzes: [],
    quizAttempts: [],
    announcements: [],
    plans: [],
    publications: [],
    activity: [],
  };
}

// ---------- Postgres ----------

export const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const LOCK_ID = 727274; // arbitrary advisory-lock key that serializes writes

const g = globalThis as unknown as { campusSql?: postgres.Sql; campusSchema?: Promise<void> };

export function sql(): postgres.Sql {
  if (!g.campusSql) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DB_URL!);
    // prepare:false keeps it compatible with Supabase's transaction pooler.
    g.campusSql = postgres(DB_URL!, { prepare: false, max: 3, idle_timeout: 20, ssl: local ? false : "require", onnotice: () => {} });
  }
  return g.campusSql;
}

export function ensureSchema(): Promise<void> {
  g.campusSchema ??= sql()
    .begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${LOCK_ID})`;
      await tx.unsafe(`create table if not exists app_meta (key text primary key, value text not null)`);
      for (const table of Object.values(TABLES)) {
        await tx.unsafe(
          `create table if not exists ${table} (seq bigint generated always as identity, id text primary key, data jsonb not null, updated_at timestamptz not null default now())`,
        );
      }
      await tx.unsafe(
        `create table if not exists user_data (user_id text not null, key text not null, value jsonb not null, updated_at timestamptz not null default now(), primary key (user_id, key))`,
      );
      // RLS with no policies: the tables are unreachable through Supabase's public REST API; only this server (direct DB connection) can read them.
      for (const table of ["app_meta", "user_data", ...Object.values(TABLES)]) await tx.unsafe(`alter table ${table} enable row level security`);

      const [existing] = await tx`select value from app_meta where key = 'secret'`;
      if (existing) return;
      const db = await seed();
      await tx`insert into app_meta (key, value) values ('secret', ${db.secret})`;
      for (const key of COLLECTIONS) await writeRows(tx, key, db[key] as Row[], new Map());
    })
    .then(() => undefined)
    .catch((e) => {
      g.campusSchema = undefined;
      throw e;
    });
  return g.campusSchema;
}

async function loadPg(tx: postgres.TransactionSql): Promise<Db> {
  const [meta] = await tx`select value from app_meta where key = 'secret'`;
  const db = { secret: meta.value } as Db;
  for (const key of COLLECTIONS) {
    const rows = await tx.unsafe(`select data from ${TABLES[key]} order by seq`);
    (db[key] as unknown[]) = rows.map((r) => r.data);
  }
  return db;
}

async function writeRows(tx: postgres.TransactionSql, key: Collection, rows: Row[], before: Map<string, string>) {
  const table = TABLES[key];
  const keep = new Set<string>();
  for (const row of rows) {
    keep.add(row.id);
    const json = JSON.stringify(row);
    if (before.get(row.id) === json) continue;
    await tx.unsafe(
      `insert into ${table} (id, data) values ($1, ($2::text)::jsonb) on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [row.id, json],
    );
  }
  const removed = [...before.keys()].filter((id) => !keep.has(id));
  if (removed.length) await tx.unsafe(`delete from ${table} where id = any($1::text[])`, [removed]);
}

function snapshot(db: Db) {
  return Object.fromEntries(COLLECTIONS.map((key) => [key, new Map((db[key] as Row[]).map((r) => [r.id, JSON.stringify(r)]))])) as Record<
    Collection,
    Map<string, string>
  >;
}

async function readPg(): Promise<Db> {
  await ensureSchema();
  return sql().begin("isolation level repeatable read read only", loadPg);
}

async function updatePg<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  await ensureSchema();
  return sql().begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK_ID})`;
    const db = await loadPg(tx);
    const before = snapshot(db);
    const result = await fn(db);
    for (const key of COLLECTIONS) await writeRows(tx, key, db[key] as Row[], before[key]);
    return result;
  }) as Promise<T>;
}

// ---------- Local JSON file ----------

const DB_PATH = process.env.CAMPUSAI_DB_PATH || path.join(process.cwd(), "data", "db.json");

let queue: Promise<unknown> = Promise.resolve();

export function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export async function writeJsonFile(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

async function loadFile(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(DB_PATH, "utf8")) as Db;
    for (const key of COLLECTIONS) (db[key] as unknown[]) ??= [];
    return db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = await seed();
    await writeJsonFile(DB_PATH, db);
    return db;
  }
}

// ---------- Public API ----------

export function readDb(): Promise<Db> {
  return DB_URL ? readPg() : withFileLock(loadFile);
}

export function updateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  if (DB_URL) return updatePg(fn);
  return withFileLock(async () => {
    const db = await loadFile();
    const result = await fn(db);
    await writeJsonFile(DB_PATH, db);
    return result;
  });
}

export function toPublicUser({ id, name, email, role, status, createdAt, department, bio, courses, officeHours, avatarColor }: User): PublicUser {
  return {
    id,
    name,
    email,
    role,
    status: status ?? "active",
    createdAt,
    department: department ?? "",
    bio: bio ?? "",
    courses: courses ?? [],
    officeHours: officeHours ?? "",
    avatarColor: avatarColor && AVATAR_COLORS.includes(avatarColor) ? avatarColor : "indigo",
  };
}

export function newUser(name: string, email: string, passwordHash: string, role: Role = "student", profile: Partial<Profile> & { status?: UserStatus } = {}): User {
  return { id: crypto.randomUUID(), name, email, passwordHash, role, createdAt: new Date().toISOString(), ...profile };
}
