"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { addAssignment, addMaterial, addQuiz, deleteAssignment, deleteMaterial, deleteQuiz, gradeSubmission } from "@/app/actions/course";
import { callAi } from "@/lib/api";
import { ACCEPT, MAX_UPLOAD_MB } from "@/lib/coursework";
import { formatDateTime, relativeTime } from "@/lib/planner";
import type { CourseAssignment, CourseMaterial, CourseQuiz, PublicUser, QuizAttempt, QuizQuestion, Submission, TeacherCourseWork } from "@/lib/types";
import FileLink from "./FileLink";
import { useUploadForm } from "./useUploadForm";

type Tab = "materials" | "assignments" | "quizzes";

export default function CourseManager({ course, work, students, back }: { course: string; work: TeacherCourseWork; students: PublicUser[]; back: { href: string; label: string } }) {
  const [tab, setTab] = useState<Tab>("materials");
  const toGrade = work.assignments.reduce((n, a) => n + a.submissions.filter((s) => !s.grade).length, 0);
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "materials", label: "Materials", count: work.materials.length },
    { id: "assignments", label: "Assignments", count: work.assignments.length },
    { id: "quizzes", label: "Quizzes", count: work.quizzes.length },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <Link href={back.href} className="text-sm text-slate-500 hover:text-indigo-700">
        ← {back.label}
      </Link>
      <section className="card relative flex flex-col gap-4 overflow-hidden border-indigo-200 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-600" />
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-indigo-500 uppercase">Course workspace</p>
          <h1 className="mt-1 text-4xl font-semibold">{course}</h1>
          <p className="mt-1 text-sm text-slate-500">Everything you post here is visible to the students enrolled in {course}.</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <dt className="text-slate-500">Students</dt>
          <dd className="text-right font-semibold">{students.length}</dd>
          <dt className="text-slate-500">Waiting to be graded</dt>
          <dd className={`text-right font-semibold ${toGrade ? "text-indigo-700" : ""}`}>{toGrade}</dd>
        </dl>
      </section>

      <nav className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label} <span className="ml-1 text-xs text-slate-400">{t.count}</span>
          </button>
        ))}
      </nav>

      {tab === "materials" && <Materials course={course} items={work.materials} />}
      {tab === "assignments" && <Assignments course={course} items={work.assignments} students={students} />}
      {tab === "quizzes" && <Quizzes course={course} items={work.quizzes} students={students} />}
    </main>
  );
}

function Notice({ state }: { state: { error?: string; success?: string } | undefined }) {
  if (!state) return null;
  return state.error ? <p className="text-sm text-red-600">{state.error}</p> : <p className="text-sm text-emerald-700">{state.success}</p>;
}

function Posted({ item }: { item: { authorName: string; createdAt: string } }) {
  return (
    <p className="text-xs text-slate-400">
      Posted by {item.authorName} · {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
    </p>
  );
}

function DeleteButton({ label, onDelete }: { label: string; onDelete: () => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => confirm(`Delete "${label}"? Students will no longer see it.`) && start(onDelete)}
      disabled={pending}
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
      aria-label={`Delete ${label}`}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

const FileHint = () => <p className="mt-1 text-xs text-slate-400">PDF, Word, PowerPoint, Excel, images, text/code or zip · up to {MAX_UPLOAD_MB} MB</p>;

function Materials({ course, items }: { course: string; items: CourseMaterial[] }) {
  const [state, action, pending] = useActionState(addMaterial, undefined);
  const upload = useUploadForm(action, state, { course });
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <form ref={upload.formRef} onSubmit={upload.onSubmit} className="card h-fit space-y-3 p-5">
        <h2 className="text-xl font-semibold">Share a material</h2>
        <input type="hidden" name="course" value={course} />
        <input name="title" placeholder="Title, e.g. Week 3 lecture slides" className="input w-full" aria-label="Material title" required maxLength={150} />
        <textarea name="description" placeholder="What is it and what should students do with it? (optional)" className="input w-full" rows={3} aria-label="Material description" />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">File</label>
          <input type="file" name="file" accept={ACCEPT} className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-800" aria-label="Material file" />
          <FileHint />
        </div>
        <input name="url" type="url" placeholder="…or a link (YouTube, Google Drive, website)" className="input w-full" aria-label="Material link" />
        <Notice state={upload.error ? { error: upload.error } : state} />
        <button className="btn-primary w-full" disabled={pending || upload.uploading}>
          {upload.uploading ? "Uploading…" : pending ? "Posting…" : "Post material"}
        </button>
      </form>

      <section className="space-y-3">
        {items.length === 0 && <p className="card p-5 text-sm text-slate-400">No materials yet. Lecture notes, slides and reading lists you share will appear here.</p>}
        {items.map((m) => (
          <article key={m.id} className="card space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{m.title}</h3>
              <DeleteButton label={m.title} onDelete={() => deleteMaterial(m.id)} />
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
            <Posted item={m} />
          </article>
        ))}
      </section>
    </div>
  );
}

function Assignments({ course, items, students }: { course: string; items: (CourseAssignment & { submissions: Submission[] })[]; students: PublicUser[] }) {
  const [state, action, pending] = useActionState(addAssignment, undefined);
  const upload = useUploadForm(action, state, { course });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <form ref={upload.formRef} onSubmit={upload.onSubmit} className="card h-fit space-y-3 p-5">
        <h2 className="text-xl font-semibold">New assignment</h2>
        <input type="hidden" name="course" value={course} />
        <input name="title" placeholder="Title, e.g. Lab 5: Recursion" className="input w-full" aria-label="Assignment title" required maxLength={150} />
        <textarea name="instructions" placeholder="Instructions, requirements, how it will be graded…" className="input w-full" rows={5} aria-label="Instructions" />
        <div className="grid grid-cols-[2fr_1fr] gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Due</label>
            <input type="datetime-local" name="due" className="input w-full" aria-label="Due date" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Points</label>
            <input type="number" name="points" min={0} max={1000} defaultValue={100} className="input w-full" aria-label="Points" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Attachment (optional)</label>
          <input type="file" name="file" accept={ACCEPT} className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-800" aria-label="Assignment file" />
          <FileHint />
        </div>
        <Notice state={upload.error ? { error: upload.error } : state} />
        <button className="btn-primary w-full" disabled={pending || upload.uploading}>
          {upload.uploading ? "Uploading…" : pending ? "Posting…" : "Post assignment"}
        </button>
      </form>

      <section className="space-y-3">
        {items.length === 0 && <p className="card p-5 text-sm text-slate-400">No assignments yet.</p>}
        {items.map((a) => {
          const submittedIds = new Set(a.submissions.map((s) => s.studentId));
          const missing = students.filter((s) => !submittedIds.has(s.id));
          const ungraded = a.submissions.filter((s) => !s.grade).length;
          return (
            <article key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-xs text-slate-500">
                    Due {formatDateTime(a.due)} ({relativeTime(a.due)}) · {a.points} points
                  </p>
                </div>
                <DeleteButton label={a.title} onDelete={() => deleteAssignment(a.id)} />
              </div>
              {a.instructions && <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">{a.instructions}</p>}
              {a.file && (
                <div className="mt-2">
                  <FileLink file={a.file} />
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-sm">
                  <span className="font-semibold">{a.submissions.length}</span>
                  <span className="text-slate-500"> of {students.length} submitted</span>
                  {ungraded > 0 && <span className="ml-2 text-indigo-700">· {ungraded} to grade</span>}
                </p>
                <button onClick={() => setOpen(open === a.id ? null : a.id)} className="btn-ghost text-xs">
                  {open === a.id ? "Hide submissions" : "View submissions"}
                </button>
              </div>
              {open === a.id && (
                <div className="mt-3 space-y-3">
                  {a.submissions.length === 0 && <p className="text-sm text-slate-400">No submissions yet.</p>}
                  {a.submissions.map((s) => (
                    <GradeRow key={s.id} submission={s} points={a.points} late={s.submittedAt > new Date(a.due).toISOString()} />
                  ))}
                  {missing.length > 0 && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">Not submitted:</span> {missing.map((s) => s.name).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function GradeRow({ submission, points, late }: { submission: Submission; points: number; late: boolean }) {
  const [grade, setGrade] = useState(submission.grade ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      await gradeSubmission(submission.id, grade, feedback);
      setSaved(true);
    });
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{submission.studentName}</p>
        <p className="text-xs text-slate-500">
          {formatDateTime(submission.submittedAt)}
          {late && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">Late</span>}
        </p>
      </div>
      {submission.note && <p className="mt-1 text-sm whitespace-pre-wrap text-slate-600">{submission.note}</p>}
      {submission.file && (
        <div className="mt-2">
          <FileLink file={submission.file} />
        </div>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
        <input
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value);
            setSaved(false);
          }}
          placeholder={`Grade / ${points}`}
          className="input"
          aria-label={`Grade for ${submission.studentName}`}
          maxLength={20}
        />
        <input
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            setSaved(false);
          }}
          placeholder="Feedback for the student"
          className="input"
          aria-label={`Feedback for ${submission.studentName}`}
        />
        <button onClick={save} disabled={pending} className="btn-primary">
          {pending ? "Saving…" : saved ? "Saved" : "Save grade"}
        </button>
      </div>
    </div>
  );
}

const blankQuestion = (): QuizQuestion => ({ question: "", options: ["", "", "", ""], answer: 0 });

function Quizzes({ course, items, students }: { course: string; items: (CourseQuiz & { attempts: QuizAttempt[] })[]; students: PublicUser[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <QuizBuilder course={course} />
      <section className="space-y-3">
        {items.length === 0 && <p className="card p-5 text-sm text-slate-400">No quizzes yet.</p>}
        {items.map((q) => {
          const avg = q.attempts.length ? Math.round((q.attempts.reduce((n, t) => n + t.score / t.total, 0) / q.attempts.length) * 100) : null;
          const done = new Set(q.attempts.map((t) => t.studentId));
          const missing = students.filter((s) => !done.has(s.id));
          return (
            <article key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{q.title}</h3>
                  <p className="text-xs text-slate-500">
                    {q.questions.length} questions{q.due && ` · due ${formatDateTime(q.due)}`}
                  </p>
                </div>
                <DeleteButton label={q.title} onDelete={() => deleteQuiz(q.id)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-sm">
                  <span className="font-semibold">{q.attempts.length}</span>
                  <span className="text-slate-500"> of {students.length} completed</span>
                  {avg !== null && <span className="ml-2 text-indigo-700">· average {avg}%</span>}
                </p>
                <button onClick={() => setOpen(open === q.id ? null : q.id)} className="btn-ghost text-xs">
                  {open === q.id ? "Hide results" : "View results"}
                </button>
              </div>
              {open === q.id && (
                <div className="mt-3 space-y-2">
                  {q.attempts.length > 0 && (
                    <table className="w-full text-left text-sm">
                      <tbody>
                        {[...q.attempts]
                          .sort((a, b) => b.score - a.score)
                          .map((t) => (
                            <tr key={t.id} className="border-b border-slate-100">
                              <td className="py-1.5">{t.studentName}</td>
                              <td className="py-1.5 text-right font-medium">
                                {t.score}/{t.total}
                              </td>
                              <td className="py-1.5 text-right text-xs text-slate-500">{new Date(t.submittedAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                  {missing.length > 0 && (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">Not taken yet:</span> {missing.map((s) => s.name).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function QuizBuilder({ course }: { course: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([blankQuestion()]);
  const [source, setSource] = useState("");
  const [count, setCount] = useState(5);
  const [drafting, setDrafting] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: string }>();
  const [pending, start] = useTransition();

  const edit = (i: number, fn: (q: QuizQuestion) => QuizQuestion) => setQuestions((list) => list.map((q, j) => (j === i ? fn(q) : q)));

  const draft = async () => {
    setDrafting(true);
    setState(undefined);
    try {
      const res = await callAi({ task: "quiz", input: source, count });
      if (!res.quiz?.length) throw new Error("Couldn't draft questions from that text. Try pasting more detailed notes.");
      setQuestions((list) => [...list.filter((q) => q.question.trim()), ...res.quiz!]);
      setState({ success: `Drafted ${res.quiz.length} questions${res.mode === "offline" ? " (offline mode: review them carefully)" : ""}. Edit anything before publishing.` });
    } catch (e) {
      setState({ error: (e as Error).message });
    } finally {
      setDrafting(false);
    }
  };

  const publish = () =>
    start(async () => {
      const res = await addQuiz({ course, title, description, due, questions });
      setState(res);
      if (res?.success) {
        setTitle("");
        setDescription("");
        setDue("");
        setSource("");
        setQuestions([blankQuestion()]);
      }
    });

  return (
    <section className="card h-fit space-y-4 p-5">
      <h2 className="text-xl font-semibold">New quiz</h2>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title, e.g. Week 4 check-in" className="input" aria-label="Quiz title" maxLength={150} />
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="input" aria-label="Quiz due date (optional)" title="Due date (optional)" />
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" className="input w-full" aria-label="Quiz description" />

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-indigo-700">Draft questions with AI from your notes</summary>
        <textarea value={source} onChange={(e) => setSource(e.target.value)} rows={5} placeholder="Paste lecture notes or a reading. AI will write multiple-choice questions you can edit." className="input mt-3 w-full" aria-label="Notes for AI quiz" />
        <div className="mt-2 flex items-center gap-2">
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input" aria-label="Number of questions">
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n} questions
              </option>
            ))}
          </select>
          <button type="button" onClick={draft} disabled={drafting || source.trim().length < 20} className="btn-ghost">
            {drafting ? "Drafting…" : "Draft questions"}
          </button>
        </div>
      </details>

      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={i} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Question {i + 1}</span>
              {questions.length > 1 && (
                <button type="button" onClick={() => setQuestions((list) => list.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
            <textarea value={q.question} onChange={(e) => edit(i, (x) => ({ ...x, question: e.target.value }))} rows={2} placeholder="Question" className="input w-full" aria-label={`Question ${i + 1}`} />
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${i}`} checked={q.answer === k} onChange={() => edit(i, (x) => ({ ...x, answer: k }))} className="accent-indigo-600" aria-label={`Mark option ${k + 1} correct`} />
                  <input
                    value={opt}
                    onChange={(e) => edit(i, (x) => ({ ...x, options: x.options.map((o, m) => (m === k ? e.target.value : o)) }))}
                    placeholder={`Option ${k + 1}`}
                    className={`input flex-1 ${q.answer === k ? "border-indigo-400" : ""}`}
                    aria-label={`Question ${i + 1} option ${k + 1}`}
                  />
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Select the circle next to the correct answer.</p>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setQuestions((list) => [...list, blankQuestion()])} className="btn-ghost">
          + Add question
        </button>
        <button type="button" onClick={publish} disabled={pending || !title.trim()} className="btn-primary">
          {pending ? "Publishing…" : "Publish quiz"}
        </button>
      </div>
      {state && <Notice state={state} />}
    </section>
  );
}
