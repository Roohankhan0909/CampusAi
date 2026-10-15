"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { deleteCampusEntry, saveCampusEntry } from "@/app/actions/admin";
import type { CampusCategory, StoredCampusEntry } from "@/lib/types";

const CATEGORIES: { id: CampusCategory; label: string }[] = [
  { id: "event", label: "Event" },
  { id: "facility", label: "Facility" },
  { id: "course", label: "Course" },
  { id: "faq", label: "FAQ" },
];

export default function CampusManager({ entries }: { entries: StoredCampusEntry[] }) {
  const [editing, setEditing] = useState<StoredCampusEntry | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [filter, setFilter] = useState<CampusCategory | "all">("all");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");

  const resetForm = useCallback((message = "") => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setNotice(message);
  }, []);

  const startEdit = (entry: StoredCampusEntry) => {
    setEditing(entry);
    setNotice("");
  };

  const shown = entries.filter((e) => filter === "all" || e.category === filter).sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <div className="space-y-3">
        {notice && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
        <EntryForm key={editing?.id ?? `new-${formKey}`} entry={editing} onDone={resetForm} />
      </div>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {[{ id: "all" as const, label: "All" }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${filter === c.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <ul className={`space-y-3 ${pending ? "opacity-60" : ""}`}>
          {shown.map((e) => (
            <li key={e.id} className={`rounded-xl border p-3 ${editing?.id === e.id ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="text-[11px] font-medium text-slate-400 uppercase">
                    {e.category}
                    {e.date && ` · ${e.date}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button onClick={() => startEdit(e)} className="text-xs font-medium text-indigo-600 hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${e.title}"?`)) {
                        if (editing?.id === e.id) resetForm();
                        startTransition(() => deleteCampusEntry(e.id));
                      }
                    }}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{e.details}</p>
            </li>
          ))}
          {shown.length === 0 && <li className="text-sm text-slate-400">No entries.</li>}
        </ul>
      </section>
    </div>
  );
}

function EntryForm({ entry, onDone }: { entry: StoredCampusEntry | null; onDone: (message?: string) => void }) {
  const [state, action, pending] = useActionState(saveCampusEntry, undefined);
  const [category, setCategory] = useState<CampusCategory>(entry?.category ?? "event");

  useEffect(() => {
    if (state?.success) onDone(state.success);
  }, [state, onDone]);

  return (
    <form action={action} className="card h-fit space-y-3 p-5">
      <h3 className="section-title">{entry ? "Edit entry" : "Add campus entry"}</h3>
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <div className="grid grid-cols-2 gap-3">
        <select name="category" value={category} onChange={(e) => setCategory(e.target.value as CampusCategory)} className="input" aria-label="Category">
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {category === "event" ? <input type="date" name="date" defaultValue={entry?.date} required className="input" aria-label="Event date" /> : <div />}
      </div>
      <input name="title" defaultValue={entry?.title} placeholder="Title" required className="input w-full" aria-label="Title" />
      <textarea name="details" defaultValue={entry?.details} placeholder="Details (hours, location, description…)" required rows={5} className="input w-full resize-y" aria-label="Details" />
      <input name="tags" defaultValue={entry?.tags.join(", ")} placeholder="Tags, comma separated (helps search)" className="input w-full" aria-label="Tags" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : entry ? "Save changes" : "Add entry"}
        </button>
        {entry && (
          <button type="button" onClick={() => onDone()} className="btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
