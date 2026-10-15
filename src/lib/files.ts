import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { MAX_UPLOAD_MB, fileTypeFor } from "./coursework";
import type { FileRef } from "./types";

// Local disk storage for course uploads. Swap for object storage (e.g. Supabase Storage) before deploying to serverless hosts.

const UPLOAD_DIR = process.env.CAMPUSAI_UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");

const pathFor = (id: string) => path.join(UPLOAD_DIR, id.replace(/[^a-zA-Z0-9-]/g, ""));

export function uploadedFile(formData: FormData, name = "file"): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}

export function checkUpload(file: File): string | null {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `Files must be ${MAX_UPLOAD_MB} MB or smaller.`;
  if (!fileTypeFor(file.name)) return "That file type isn't allowed. Upload a PDF, Office document, image, text/code file, or zip.";
  return null;
}

export async function saveUpload(file: File): Promise<FileRef> {
  const id = crypto.randomUUID();
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(pathFor(id), Buffer.from(await file.arrayBuffer()));
  return { id, name: file.name.replace(/[\\/]/g, "_").slice(-120), size: file.size, type: fileTypeFor(file.name)! };
}

export function readUpload(id: string): Promise<Buffer> {
  return fs.readFile(pathFor(id));
}

export async function deleteUploads(files: (FileRef | undefined)[]) {
  await Promise.all(files.map((f) => f && fs.rm(pathFor(f.id), { force: true })));
}
