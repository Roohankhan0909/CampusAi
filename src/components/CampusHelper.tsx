"use client";

import { useState } from "react";
import { callAi } from "@/lib/api";
import { CAMPUS_NAME } from "@/lib/campus-data";
import { KEYS } from "@/lib/planner";
import type { CampusCategory, ChatMessage, StoredCampusEntry } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";
import Chat from "./Chat";

const FILTERS: { id: CampusCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "event", label: "Events" },
  { id: "facility", label: "Facilities" },
  { id: "course", label: "Courses" },
  { id: "faq", label: "FAQ" },
];

export default function CampusHelper({ campus }: { campus: StoredCampusEntry[] }) {
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(KEYS.campusChat, []);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<CampusCategory | "all">("all");
  const [query, setQuery] = useState("");

  const send = async (text: string) => {
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await callAi({ task: "campus", messages: next });
      setMessages([...next, { role: "assistant", content: res.text ?? "" }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `Sorry, something went wrong: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const q = query.toLowerCase();
  const entries = campus
    .filter((e) => filter === "all" || e.category === filter)
    .filter((e) => !q || `${e.title} ${e.details} ${e.tags.join(" ")}`.toLowerCase().includes(q));

  return (
    <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
      <Chat
        messages={messages}
        onSend={send}
        onClear={() => setMessages([])}
        loading={loading}
        placeholder={`Ask about ${CAMPUS_NAME}…`}
        emptyTitle={`Ask about courses, events, and facilities at ${CAMPUS_NAME}.`}
        suggestions={["When is the library open?", "Where can I get tutoring?", "Any career events coming up?", "When are midterms?"]}
      />
      <div className="card flex h-[62vh] min-h-[420px] flex-col p-4">
        <h3 className="section-title mb-3">Browse campus info</h3>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="input mb-3" aria-label="Search campus info" />
        <div className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ul className="flex-1 space-y-3 overflow-y-auto pr-1">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-slate-200 p-3">
              {e.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${e.image.id}`} alt={e.title} loading="lazy" className="mb-2 h-36 w-full rounded-lg object-cover" />
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{e.title}</p>
                <span className="shrink-0 text-[11px] font-medium text-slate-400 uppercase">{e.date ?? e.category}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{e.details}</p>
            </li>
          ))}
          {entries.length === 0 && <p className="text-sm text-slate-400">No matches.</p>}
        </ul>
      </div>
    </div>
  );
}
