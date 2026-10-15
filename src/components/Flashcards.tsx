"use client";

import { useState } from "react";
import { callAi } from "@/lib/api";
import { KEYS } from "@/lib/planner";
import type { Flashcard } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";

type Deck = { cards: Flashcard[]; known: number[] };

export default function Flashcards({ notesInput, notes }: { notesInput: React.ReactNode; notes: string }) {
  const [deck, setDeck] = useLocalStorage<Deck>(KEYS.flashcards, { cards: [], known: [] });
  const [count, setCount] = useState(10);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await callAi({ task: "flashcards", input: notes, count });
      const cards = res.flashcards ?? [];
      if (cards.length === 0) setError("Couldn't make flashcards from these notes. Try adding more detail.");
      else setDeck({ cards, known: [] });
      setIndex(0);
      setFlipped(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const go = (i: number) => {
    setIndex((i + deck.cards.length) % deck.cards.length);
    setFlipped(false);
  };
  const mark = (known: boolean) => {
    setDeck((d) => ({ ...d, known: known ? [...new Set([...d.known, index])] : d.known.filter((k) => k !== index) }));
    go(index + 1);
  };

  const card = deck.cards[index];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card h-fit space-y-4 p-5">
        {notesInput}
        <div className="flex items-center gap-3">
          <label htmlFor="card-count" className="text-sm">
            Cards
          </label>
          <select id="card-count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="input">
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button onClick={run} disabled={loading || !notes.trim()} className="btn-primary">
            {loading ? "Generating…" : "Make flashcards"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {card ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Card {index + 1} of {deck.cards.length}
            </span>
            <span>
              Known: {deck.known.length}/{deck.cards.length}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(deck.known.length / deck.cards.length) * 100}%` }} />
          </div>
          <button
            onClick={() => setFlipped((f) => !f)}
            className={`card flex min-h-[240px] w-full flex-col items-center justify-center p-8 text-center transition ${flipped ? "border-indigo-300 bg-indigo-50" : "hover:border-indigo-200"}`}
            aria-label="Flip card"
          >
            <span className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{flipped ? "Answer" : "Question"}</span>
            <span className={`whitespace-pre-wrap ${flipped ? "text-sm text-slate-700" : "text-lg font-semibold"}`}>{flipped ? card.back : card.front}</span>
            {!flipped && <span className="mt-4 text-xs text-slate-400">Click to reveal</span>}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => go(index - 1)} className="btn-ghost">
              ← Prev
            </button>
            <div className="flex gap-2">
              <button onClick={() => mark(false)} className="btn-ghost">
                Still learning
              </button>
              <button onClick={() => mark(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                I know it
              </button>
            </div>
            <button onClick={() => go(index + 1)} className="btn-ghost">
              Next →
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 text-sm text-slate-400">Paste notes and generate a deck of flashcards to review.</div>
      )}
    </div>
  );
}
