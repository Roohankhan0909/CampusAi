"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClear?: () => void;
  loading: boolean;
  placeholder: string;
  suggestions?: string[];
  emptyTitle: string;
};

export default function Chat({ messages, onSend, onClear, loading, placeholder, suggestions = [], emptyTitle }: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setDraft("");
    onSend(t);
  };

  return (
    <div className="card flex h-[62vh] min-h-[420px] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-slate-500">{emptyTitle}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => submit(s)} className="chip">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-400">Thinking…</div>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="input flex-1"
          aria-label="Message"
        />
        <button type="submit" disabled={loading || !draft.trim()} className="btn-primary">
          Send
        </button>
        {onClear && messages.length > 0 && (
          <button type="button" onClick={onClear} className="btn-ghost">
            Clear
          </button>
        )}
      </form>
    </div>
  );
}
