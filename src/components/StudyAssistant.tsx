"use client";

import { useState } from "react";
import { callAi } from "@/lib/api";
import { KEYS } from "@/lib/planner";
import type { ChatMessage, QuizQuestion } from "@/lib/types";
import { useLocalStorage } from "@/lib/useLocalStorage";
import Chat from "./Chat";

type Sub = "chat" | "summarize" | "quiz";

const SAMPLE_NOTES =
  "Photosynthesis is the process plants use to convert light energy into chemical energy. It takes place mainly in the chloroplasts of leaf cells. Chlorophyll is the green pigment that absorbs light, mostly in the blue and red wavelengths. The light-dependent reactions occur in the thylakoid membranes and produce ATP and NADPH while releasing oxygen from water. The Calvin cycle occurs in the stroma and uses ATP and NADPH to fix carbon dioxide into glucose. Factors such as light intensity, carbon dioxide concentration, and temperature affect the rate of photosynthesis.";

export default function StudyAssistant() {
  const [sub, setSub] = useState<Sub>("chat");
  const tabs: { id: Sub; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "summarize", label: "Summarize notes" },
    { id: "quiz", label: "Quiz me" },
  ];

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${sub === t.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {sub === "chat" && <StudyChat />}
      {sub === "summarize" && <Summarizer />}
      {sub === "quiz" && <QuizMaker />}
    </div>
  );
}

function StudyChat() {
  const [messages, setMessages] = useLocalStorage<ChatMessage[]>(KEYS.studyChat, []);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await callAi({ task: "chat", messages: next });
      setMessages([...next, { role: "assistant", content: res.text ?? "" }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `Sorry, something went wrong: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Chat
      messages={messages}
      onSend={send}
      onClear={() => setMessages([])}
      loading={loading}
      placeholder="Ask anything about your studies…"
      emptyTitle="Ask a question, get an explanation, or ask for study tips."
      suggestions={["How should I prepare for midterms?", "I keep procrastinating. Help!", "Explain recursion simply", "How do I remember what I read?"]}
    />
  );
}

function NotesInput({ notes, setNotes }: { notes: string; setNotes: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="notes" className="text-sm font-medium">
          Your notes
        </label>
        <button onClick={() => setNotes(SAMPLE_NOTES)} className="text-xs font-medium text-indigo-600 hover:underline">
          Use sample notes
        </button>
      </div>
      <textarea
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={10}
        placeholder="Paste lecture notes, a textbook section, or an article…"
        className="input w-full resize-y"
      />
      <p className="text-xs text-slate-400">{notes.trim() ? notes.trim().split(/\s+/).length : 0} words</p>
    </div>
  );
}

function Summarizer() {
  const [notes, setNotes] = useLocalStorage<string>(KEYS.notes, "");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await callAi({ task: "summarize", input: notes });
      setSummary(res.text ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card space-y-4 p-5">
        <NotesInput notes={notes} setNotes={setNotes} />
        <button onClick={run} disabled={loading || !notes.trim()} className="btn-primary">
          {loading ? "Summarizing…" : "Summarize"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="card p-5">
        <h3 className="section-title mb-3">Summary</h3>
        {summary ? <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{summary}</div> : <p className="text-sm text-slate-400">Your summary will appear here.</p>}
      </div>
    </div>
  );
}

function QuizMaker() {
  const [notes, setNotes] = useLocalStorage<string>(KEYS.notes, "");
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await callAi({ task: "quiz", input: notes, count });
      const questions = res.quiz ?? [];
      if (questions.length === 0) setError("Couldn't build questions from these notes. Try adding more detail.");
      setQuiz(questions);
      setAnswers({});
      setSubmitted(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const score = quiz.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card h-fit space-y-4 p-5">
        <NotesInput notes={notes} setNotes={setNotes} />
        <div className="flex items-center gap-3">
          <label htmlFor="count" className="text-sm">
            Questions
          </label>
          <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="input">
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button onClick={run} disabled={loading || !notes.trim()} className="btn-primary">
            {loading ? "Generating…" : "Generate quiz"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="space-y-4">
        {quiz.length === 0 && (
          <div className="card p-5 text-sm text-slate-400">Generate a quiz from your notes to test yourself.</div>
        )}
        {quiz.map((q, i) => (
          <div key={i} className="card p-5">
            <p className="mb-3 text-sm font-medium">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, j) => {
                const chosen = answers[i] === j;
                const style = submitted
                  ? j === q.answer
                    ? "border-emerald-400 bg-emerald-50"
                    : chosen
                      ? "border-red-400 bg-red-50"
                      : "border-slate-200"
                  : chosen
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:bg-slate-50";
                return (
                  <button
                    key={j}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                    className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && <p className="mt-3 text-xs text-slate-500">{q.explanation}</p>}
          </div>
        ))}
        {quiz.length > 0 && (
          <div className="card flex items-center justify-between p-4">
            {submitted ? (
              <p className="text-sm font-semibold">
                Score: {score}/{quiz.length}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {Object.keys(answers).length}/{quiz.length} answered
              </p>
            )}
            {submitted ? (
              <button onClick={run} className="btn-ghost">
                New quiz
              </button>
            ) : (
              <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < quiz.length} className="btn-primary">
                Check answers
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
