import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSecret } from "./auth";
import { MAX_UPLOAD_MB, MIME_TYPES, fileTypeFor } from "./coursework";
import type { FileRef } from "./types";

// Course uploads go straight from the browser to storage (Supabase Storage when configured, local disk otherwise),
// so large files never pass through the app server. The server hands out a signed upload URL plus a signed "ref"
// that the form submits back; claimUpload verifies the ref and the stored object before saving its metadata.

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const usingObjectStorage = Boolean(SUPABASE_URL && SERVICE_KEY);
const BUCKET = process.env.SUPABASE_BUCKET || "course-files";
const UPLOAD_DIR = process.env.CAMPUSAI_UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
const TICKET_TTL_MS = 2 * 3600 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type UploadTicket = { url: string; contentType: string; ref: string };

let supabase: SupabaseClient | undefined;
let bucketReady: Promise<void> | undefined;

function bucket() {
  supabase ??= createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return supabase.storage.from(BUCKET);
}

function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const storage = supabase!.storage;
    if (!(await storage.getBucket(BUCKET)).error) return;
    const { error } = await storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_UPLOAD_BYTES, allowedMimeTypes: MIME_TYPES });
    if (error && !/exist/i.test(error.message)) throw error;
  })().catch((e) => {
    bucketReady = undefined;
    throw e;
  });
  return bucketReady;
}

const pathFor = (id: string) => path.join(UPLOAD_DIR, id.replace(/[^a-zA-Z0-9-]/g, ""));
const hmac = async (payload: string) => crypto.createHmac("sha256", await getSecret()).update(payload).digest("base64url");
const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function checkUpload(name: string, size: number): string | null {
  if (!(size > 0)) return "That file is empty.";
  if (size > MAX_UPLOAD_BYTES) return `Files must be ${MAX_UPLOAD_MB} MB or smaller.`;
  if (!fileTypeFor(name)) return "That file type isn't allowed. Upload a PDF, Office document, image, text/code file, or zip.";
  return null;
}

export async function createUpload(userId: string, name: string, size: number): Promise<{ ticket?: UploadTicket; error?: string }> {
  const problem = checkUpload(name, size);
  if (problem) return { error: problem };
  const id = crypto.randomUUID();
  const contentType = fileTypeFor(name)!;
  const exp = Date.now() + TICKET_TTL_MS;

  let url: string;
  if (usingObjectStorage) {
    bucket();
    await ensureBucket();
    const { data, error } = await bucket().createSignedUploadUrl(id);
    if (error || !data) return { error: "Couldn't start the upload. Please try again." };
    url = data.signedUrl;
  } else {
    url = `/api/uploads/${id}?exp=${exp}&sig=${await hmac(`put.${id}.${exp}`)}`;
  }
  const payload = Buffer.from(JSON.stringify({ id, name: name.replace(/[\\/]/g, "_").slice(-120), type: contentType, userId, exp })).toString("base64url");
  return { ticket: { url, contentType, ref: `${payload}.${await hmac(`ref.${payload}`)}` } };
}

export async function verifyLocalUpload(id: string, exp: string, sig: string): Promise<boolean> {
  return UUID.test(id) && Number(exp) > Date.now() && safeEqual(sig, await hmac(`put.${id}.${exp}`));
}

export async function writeLocalUpload(id: string, data: Buffer) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(pathFor(id), data, { flag: "wx" });
}

async function storedSize(id: string): Promise<number | null> {
  if (usingObjectStorage) {
    const { data } = await bucket().list("", { search: id, limit: 5 });
    const obj = data?.find((o) => o.name === id);
    return obj ? Number(obj.metadata?.size ?? 0) : null;
  }
  try {
    return (await fs.stat(pathFor(id))).size;
  } catch {
    return null;
  }
}

export async function claimUpload(ref: string, userId: string): Promise<{ file?: FileRef; error?: string }> {
  const invalid = { error: "That upload couldn't be verified. Please attach the file again." };
  const [payload, sig] = ref.split(".");
  if (!payload || !sig || !safeEqual(sig, await hmac(`ref.${payload}`))) return invalid;
  const t = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: string; name: string; type: string; userId: string; exp: number };
  if (t.userId !== userId || t.exp < Date.now() || !UUID.test(t.id)) return invalid;
  const size = await storedSize(t.id);
  if (!size) return { error: "The file didn't finish uploading. Please try again." };
  if (size > MAX_UPLOAD_BYTES) {
    await deleteUploads([{ id: t.id } as FileRef]);
    return { error: `Files must be ${MAX_UPLOAD_MB} MB or smaller.` };
  }
  return { file: { id: t.id, name: t.name, size, type: t.type } };
}

export async function signedDownloadUrl(file: FileRef, inline: boolean): Promise<string | null> {
  const { data } = await bucket().createSignedUrl(file.id, 60, inline ? undefined : { download: file.name });
  return data?.signedUrl ?? null;
}

export function readUpload(id: string): Promise<Buffer> {
  return fs.readFile(pathFor(id));
}

export async function deleteUploads(files: (FileRef | undefined)[]) {
  const ids = files.filter((f): f is FileRef => Boolean(f)).map((f) => f.id);
  if (!ids.length) return;
  if (usingObjectStorage) await bucket().remove(ids);
  else await Promise.all(ids.map((id) => fs.rm(pathFor(id), { force: true })));
}
