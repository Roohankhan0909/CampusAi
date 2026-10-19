"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/db";
import { claimUpload, deleteUploads } from "@/lib/files";
import { PUBLICATION_TYPES, canReview, reviewersFor } from "@/lib/publications";
import type { FormState, PublicationKind } from "@/lib/types";

const field = (formData: FormData, name: string, max = 500) => String(formData.get(name) ?? "").trim().slice(0, max);

function refresh() {
  revalidatePath("/");
  revalidatePath("/teacher");
  revalidatePath("/admin");
}

export async function submitPublication(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const kind = field(formData, "kind") as PublicationKind;
  const title = field(formData, "title", 200);
  const abstract = field(formData, "abstract", 3000);
  const reviewerId = field(formData, "reviewer", 60);
  const ref = field(formData, "fileRef", 4000);
  if (kind !== "article" && kind !== "paper") return { error: "Choose article or research paper." };
  if (!title || abstract.length < 20) return { error: "Add a title and a summary of at least 20 characters." };
  if (!ref) return { error: "Attach your article or paper as a PDF or Word file." };
  const reviewer = reviewersFor(await readDb(), user).find((r) => r.id === reviewerId);
  if (!reviewer) return { error: "Choose who should review it." };
  const { file, error } = await claimUpload(ref, user.id);
  if (!file) return { error: error ?? "Upload failed." };
  if (!PUBLICATION_TYPES.includes(file.type)) {
    await deleteUploads([file]);
    return { error: "Upload a PDF or Word document." };
  }
  await updateDb((db) => {
    db.publications.push({
      id: crypto.randomUUID(),
      kind,
      title,
      abstract,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      reviewerId: reviewer.id,
      reviewerName: reviewer.name,
      file,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  });
  refresh();
  return { success: `Sent to ${reviewer.name} for review.` };
}

export async function reviewPublication(id: string, decision: "approved" | "rejected", note: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (decision !== "approved" && decision !== "rejected") return { error: "Invalid decision." };
  const ok = await updateDb((db) => {
    const p = db.publications.find((x) => x.id === id);
    if (!p || p.status !== "pending" || (p.authorId === user.id && user.role !== "admin") || !canReview(user, p)) return false;
    Object.assign(p, { status: decision, note: String(note ?? "").trim().slice(0, 1000) || undefined, reviewedAt: new Date().toISOString(), reviewedBy: user.name });
    return true;
  });
  if (!ok) return { error: "You can't review this submission." };
  refresh();
  return {};
}

export async function deletePublication(id: string) {
  const user = await requireUser();
  const removed = await updateDb((db) => {
    const p = db.publications.find((x) => x.id === id);
    if (!p || (p.authorId !== user.id && user.role !== "admin")) return null;
    db.publications = db.publications.filter((x) => x.id !== id);
    return p;
  });
  if (removed) await deleteUploads([removed.file]);
  refresh();
}
