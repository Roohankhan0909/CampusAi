"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { submitAssignment, submitQuiz } from "@/app/actions/course";
import { ACCEPT, MAX_UPLOAD_MB } from "@/lib/coursework";
import { dueStatus, formatDateTime, relativeTime } from "@/lib/planner";
import type { Assignment, PublicUser, QuizAttempt, QuizQuestion, StudentAssignment, StudentCourseWork, StudentQuiz } from "@/lib/types";
import StatusBadge from "../StatusBadge";
import FileLink from "./FileLink";

const statusFor = (due: string, done: boolean) => dueStatus({ due, done } as Assignment);

export default function StudentCourses({ user, work }: { user: PublicUser; work: StudentCourseWork }) {
  const [course, setCourse] = useState<string>("all");
  if (user.courses.length === 0) {
    return (
      <section className="card p-6 text-center">
        <p className="font-medium">You haven&apos;t added any courses yet.</p>
        <p className="mt-1 text-sm text-slate-500">Add your course codes (e.g. CS101) to your profile to see materials, assignments and quizzes from your teachers.</p>
        <Link href="/profile" className="btn-primary mt-4 inline-block">
          Add my courses
        </Link>
      </section>
    );
  }

  const inCourse = <T extends { course: string }>(list: T[]) => list.filter((x) => course === "all" || x.course === course);
  const assignments = inCourse(work.assignments);
  const quizzes = inCourse(work.quizzes);
  const materials = inCourse(work.materials);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {["all", ...user.courses].map((c) => (
          <button
            key={c}
            onClick={() => setCourse(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${course === c ? "bg-indigo-600 text-[#0a0a0a]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {c === "all" ? "All courses" : c}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Assignments</h2>
        {assignments.length === 0 && <p className="card p-5 text-sm text-slate-400">No assignments posted yet.</p>}
        {assignments.map((a) => (
          <AssignmentCard key={a.id} assignment={a} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Quizzes</h2>
        {quizzes.length === 0 && <p className="card p-5 text-sm text-slate-400">No quizzes posted yet.</p>}
        {quizzes.map((q) => (
          <QuizCard key={q.id} quiz={q} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Course materials</h2>
        {materials.length === 0 && <p className="card p-5 text-sm text-slate-400">No materials shared yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {materials.map((m) => (
            <article key={m.id} className="card space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{m.title}</h3>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{m.course}</span>
              </div>
              {m.description && <p className="text-sm whitespace-pre-wrap text-slate-600">{m.description}</p>}
              <div className="flex flex-wrap gap-2">
                {m.file && <FileLink file={m.file} />}
                {m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="truncate text-xs text-indigo-700 hover:underline">
                    {m.url}
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {m.authorName} · {new Date(m.createdAt).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AssignmentCard({ assignment: a }: { assignment: StudentAssignment }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitAssignment, undefined);
  const s = a.submission;
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{a.course}</span>
            <h3 className="font-semibold">{a.title}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Due {formatDateTime(a.due)} ({relativeTime(a.due)}) · {a.points} points · {a.authorName}
          </p>
        </div>
        {s ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{s.grade ? `Graded: ${s.grade}/${a.points}` : "Submitted"}</span>
        ) : (
          <StatusBadge status={statusFor(a.due, false)} />
        )}
      </div>
      {a.instructions && <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">{a.instructions}</p>}
      {a.file && (
        <div className="mt-2">
          <FileLink file={a.file} />
        </div>
      )}
      {s && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-500">You submitted on {formatDateTime(s.submittedAt)}</p>
          {s.note && <p className="mt-1 whitespace-pre-wrap text-slate-700">{s.note}</p>}
          {s.file && (
            <div className="mt-2">
              <FileLink file={s.file} />
            </div>
          )}
          {s.feedback && (
            <p className="mt-2 border-t border-slate-200 pt-2 text-slate-700">
              <span className="font-medium text-indigo-700">Teacher feedback:</span> {s.feedback}
            </p>
          )}
        </div>
      )}
      <div className="mt-3">
        {!open ? (
          <button onClick={() => setOpen(true)} className={s ? "btn-ghost text-xs" : "btn-primary"}>
            {s ? "Resubmit" : "Submit work"}
          </button>
        ) : (
          <form action={action} className="space-y-2 rounded-xl border border-slate-200 p-3">
            <input type="hidden" name="assignmentId" value={a.id} />
            <textarea name="note" rows={3} placeholder="Add a note for your teacher (optional if you attach a file)" className="input w-full" aria-label={`Note for ${a.title}`} />
            <input type="file" name="file" accept={ACCEPT} className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-800" aria-label={`File for ${a.title}`} />
            <p className="text-xs text-slate-400">Up to {MAX_UPLOAD_MB} MB. Resubmitting replaces your previous submission.</p>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
            <div className="flex gap-2">
              <button className="btn-primary" disabled={pending}>
                {pending ? "Submitting…" : "Submit"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                Close
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}

function QuizCard({ quiz }: { quiz: StudentQuiz }) {
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ attempt: QuizAttempt; review: QuizQuestion[] } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const attempt = result?.attempt ?? quiz.attempt;
  const review = result?.review ?? quiz.review;

  const submit = () =>
    start(async () => {
      const res = await submitQuiz(
        quiz.id,
        quiz.questions.map((_, i) => answers[i] ?? -1),
      );
      if (res.error || !res.attempt || !res.review) return setError(res.error ?? "Couldn't submit the quiz.");
      setResult({ attempt: res.attempt, review: res.review });
      setTaking(false);
      setShowReview(true);
    });

  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{quiz.course}</span>
            <h3 className="font-semibold">{quiz.title}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {quiz.questions.length} questions{quiz.due && ` · due ${formatDateTime(quiz.due)} (${relativeTime(quiz.due)})`} · {quiz.authorName}
          </p>
          {quiz.description && <p className="mt-1 text-sm text-slate-600">{quiz.description}</p>}
        </div>
        {attempt ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Score: {attempt.score}/{attempt.total}
          </span>
        ) : (
          quiz.due && <StatusBadge status={statusFor(quiz.due, false)} />
        )}
      </div>

      {attempt && review ? (
        <div className="mt-3">
          <button onClick={() => setShowReview(!showReview)} className="btn-ghost text-xs">
            {showReview ? "Hide answers" : "Review answers"}
          </button>
          {showReview && (
            <ol className="mt-3 space-y-3">
              {review.map((q, i) => (
                <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p className="font-medium">
                    {i + 1}. {q.question}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {q.options.map((o, k) => {
                      const correct = k === q.answer;
                      const picked = k === attempt.answers[i];
                      return (
                        <li key={k} className={`rounded-lg px-2 py-1 ${correct ? "bg-emerald-50 text-emerald-700" : picked ? "bg-red-50 text-red-700" : "text-slate-600"}`}>
                          {o}
                          {correct ? " ✓" : picked ? " (your answer)" : ""}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && <p className="mt-2 text-xs text-slate-500">{q.explanation}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : !taking ? (
        <button onClick={() => setTaking(true)} className="btn-primary mt-3">
          Start quiz
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">You get one attempt. Your score is shared with your teacher.</p>
          {quiz.questions.map((q, i) => (
            <fieldset key={i} className="rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-medium">
                {i + 1}. {q.question}
              </legend>
              <div className="mt-1 space-y-1">
                {q.options.map((o, k) => (
                  <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${answers[i] === k ? "bg-indigo-50 text-indigo-800" : "hover:bg-slate-50"}`}>
                    <input type="radio" name={`${quiz.id}-${i}`} checked={answers[i] === k} onChange={() => setAnswers({ ...answers, [i]: k })} className="accent-indigo-600" />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={pending || Object.keys(answers).length < quiz.questions.length} className="btn-primary">
              {pending ? "Submitting…" : "Submit answers"}
            </button>
            <span className="text-xs text-slate-500">
              {Object.keys(answers).length}/{quiz.questions.length} answered
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
