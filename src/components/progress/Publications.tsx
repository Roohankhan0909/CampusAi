"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deletePublication, reviewPublication, submitPublication } from "@/app/actions/publications";
import { useUploadForm } from "@/components/course/useUploadForm";
import { markStudied } from "@/lib/activity";
import type { Publication, PublicationsView } from "@/lib/types";

const KIND = { article: "Article", paper: "Research paper" } as const;
const STATUS_STYLE = { pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-800", rejected: "bg-red-100 text-red-700" } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function Meta({ p }: { p: Publication }) {
  return (
    <p className="text-xs text-slate-500">
      {KIND[p.kind]} · {p.authorName} ({p.authorRole}) · {date(p.createdAt)}
    </p>
  );
}

function SubmitForm({ reviewers }: { reviewers: PublicationsView["reviewers"] }) {
  const [state, action, pending] = useActionState(submitPublication, undefined);
  const upload = useUploadForm(action, state, { purpose: "publication" });
  useEffect(() => {
    if (state?.success) markStudied();
  }, [state]);
  return (
    <form ref={upload.formRef} onSubmit={upload.onSubmit} className="card h-fit space-y-3 p-5">
      <h3 className="section-title">Submit your work</h3>
      <p className="text-xs text-slate-500">Send an article or research paper for review. Once approved it appears in the library for everyone.</p>
      <div className="grid grid-cols-2 gap-3">
        <select name="kind" className="input" aria-label="Type" defaultValue="article">
          <option value="article">Article</option>
          <option value="paper">Research paper</option>
        </select>
        <select name="reviewer" className="input" aria-label="Reviewer" required defaultValue="">
          <option value="" disabled>
            Reviewer…
          </option>
          {reviewers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <input name="title" placeholder="Title" className="input w-full" aria-label="Publication title" required maxLength={200} />
      <textarea name="abstract" placeholder="Summary / abstract" className="input w-full" rows={4} aria-label="Summary" required minLength={20} maxLength={3000} />
      <label className="block text-xs font-medium text-slate-500">
        PDF or Word file (up to 10 MB)
        <input type="file" name="file" accept=".pdf,.doc,.docx" className="input mt-1 w-full" aria-label="Publication file" required />
      </label>
      {(upload.error || state?.error) && <p className="text-sm text-red-600">{upload.error || state?.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button disabled={pending || upload.uploading} className="btn-primary">
        {upload.uploading ? "Uploading…" : pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

function ReviewItem({ p }: { p: Publication }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();
  const decide = (d: "approved" | "rejected") =>
    start(async () => {
      const res = await reviewPublication(p.id, d, note);
      setError(res.error);
    });
  return (
    <li className="rounded-xl border border-slate-200 p-4">
      <p className="font-medium">{p.title}</p>
      <Meta p={p} />
      <p className="mt-2 text-sm whitespace-pre-line text-slate-600">{p.abstract}</p>
      <a href={`/api/files/${p.file.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
        Open {p.file.name}
      </a>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the author (optional)" className="input mt-3 w-full" rows={2} aria-label="Review note" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button disabled={busy} onClick={() => decide("approved")} className="btn-primary">
          Approve
        </button>
        <button disabled={busy} onClick={() => decide("rejected")} className="btn-ghost">
          Reject
        </button>
      </div>
    </li>
  );
}

export default function Publications({ view, canDeleteAny = false }: { view: PublicationsView; canDeleteAny?: boolean }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "article" | "paper">("all");
  const [, start] = useTransition();
  const q = query.trim().toLowerCase();
  const library = view.library.filter((p) => (kind === "all" || p.kind === kind) && (!q || `${p.title} ${p.abstract} ${p.authorName}`.toLowerCase().includes(q)));
  const remove = (id: string) => confirm("Delete this submission?") && start(() => deletePublication(id));

  return (
    <div className="space-y-6">
      {view.toReview.length > 0 && (
        <section className="card p-5">
          <h3 className="section-title mb-3">Waiting for your review ({view.toReview.length})</h3>
          <ul className="space-y-3">
            {view.toReview.map((p) => (
              <ReviewItem key={p.id} p={p} />
            ))}
          </ul>
        </section>
      )}
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-6">
          <SubmitForm reviewers={view.reviewers} />
          <section className="card p-5">
            <h3 className="section-title mb-3">My submissions</h3>
            {view.mine.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing submitted yet.</p>
            ) : (
              <ul className="space-y-3">
                {view.mine.map((p) => (
                  <li key={p.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{p.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {KIND[p.kind]} · reviewer: {p.reviewerName}
                      {p.reviewedBy ? ` · reviewed by ${p.reviewedBy}` : ""}
                    </p>
                    {p.note && <p className="mt-1 text-xs text-slate-600">Note: {p.note}</p>}
                    <button onClick={() => remove(p.id)} className="mt-1 text-xs text-slate-400 hover:text-red-600">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section className="card p-5">
          <h3 className="section-title mb-3">Publications library</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, author, topic…" className="input flex-1" aria-label="Search publications" />
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="input" aria-label="Filter type">
              <option value="all">All</option>
              <option value="article">Articles</option>
              <option value="paper">Research papers</option>
            </select>
          </div>
          {library.length === 0 ? (
            <p className="text-sm text-slate-500">No approved publications yet.</p>
          ) : (
            <ul className="space-y-4">
              {library.map((p) => (
                <li key={p.id} className="border-b border-slate-200 pb-4 last:border-0">
                  <p className="font-serif text-lg font-semibold">{p.title}</p>
                  <Meta p={p} />
                  <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line text-slate-600">{p.abstract}</p>
                  <div className="mt-2 flex gap-3 text-sm">
                    <a href={`/api/files/${p.file.id}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      Read ({p.file.name})
                    </a>
                    {canDeleteAny && (
                      <button onClick={() => remove(p.id)} className="text-xs text-slate-400 hover:text-red-600">
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
