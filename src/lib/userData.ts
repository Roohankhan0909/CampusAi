import path from "path";
import { promises as fs } from "fs";
import { DB_URL, ensureSchema, sql, withFileLock, writeJsonFile } from "./db";

// Per-user app data (planner, timetable, chats, flashcards…) synced from the browser. Kept out of the main Db so requests don't load everyone's data.

export const USER_DATA_KEY = /^[a-zA-Z0-9._-]{1,80}$/;
export const MAX_USER_VALUE_BYTES = 512 * 1024;

type Store = Record<string, Record<string, unknown>>;
const FILE = process.env.CAMPUSAI_USER_DATA_PATH || path.join(process.cwd(), "data", "user-data.json");

async function loadFile(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
}

export async function getUserData(userId: string): Promise<Record<string, unknown>> {
  if (!DB_URL) return withFileLock(async () => (await loadFile())[userId] ?? {});
  await ensureSchema();
  const rows = await sql()`select key, value from user_data where user_id = ${userId}`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setUserData(userId: string, key: string, json: string): Promise<void> {
  if (!DB_URL) {
    return withFileLock(async () => {
      const store = await loadFile();
      store[userId] = { ...store[userId], [key]: JSON.parse(json) };
      await writeJsonFile(FILE, store);
    });
  }
  await ensureSchema();
  await sql().unsafe(
    `insert into user_data (user_id, key, value) values ($1, $2, ($3::text)::jsonb) on conflict (user_id, key) do update set value = excluded.value, updated_at = now()`,
    [userId, key, json],
  );
}

export async function deleteUserData(userId: string): Promise<void> {
  if (!DB_URL) {
    return withFileLock(async () => {
      const store = await loadFile();
      delete store[userId];
      await writeJsonFile(FILE, store);
    });
  }
  await ensureSchema();
  await sql()`delete from user_data where user_id = ${userId}`;
}
