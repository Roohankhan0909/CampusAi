"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canManageCourse, isEnrolled, normalizeCourse } from "@/lib/course";
import { readDb, updateDb } from "@/lib/db";
import { claimUpload, createUpload, deleteUploads, type UploadTicket } from "@/lib/files";
import type { FileRef, FormState, PlanTask, PublicUser, QuizAttempt, QuizQuestion } from "@/lib/types";

const field = (formData: FormData, name: string, max = 500) => String(formData.get(name) ?? "").trim().slice(0, max);
const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const DUE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function refresh(course: string) {
  revalidatePath("/");
  revalidatePath("/teacher");
  revalidatePath(`/teacher/course/${course}`);
}

async function courseManager(rawCourse: string): Promise<{ user: PublicUser; course: string } | null> {
  const user = await requireUser();
  const course = normalizeCourse(rawCourse);
  return course && canManageCourse(user, course) ? { user, course } : null;
}

async function storeOptionalFile(formData: FormData, userId: string): Promise<{ file?: FileRef; error?: string }> {
  const ref = field(formData, "fileRef", 4000);
  return ref ? claimUpload(ref, userId) : {};
}

export async function prepareUpload(input: { name: string; size: number; course?: string; assignmentId?: string; purpose?: "campus" | "publication" }): Promise<{ ticket?: UploadTicket; error?: string }> {
  const user = await requireUser();
  if (input?.purpose === "campus") {
    if (user.role !== "admin") return { error: "Only admins can add campus pictures." };
  } else if (input?.purpose === "publication") {
    // any signed-in user may submit a publication
  } else if (input?.assignmentId) {
    const assignment = (await readDb()).assignments.find((a) => a.id === input.assignmentId);
    if (!assignment || !isEnrolled(user, assignment.course)) return { error: "You aren't enrolled in this course." };
  } else if (!canManageCourse(user, normalizeCourse(clip(input?.course, 20)))) {
    return { error: "You can only post to courses you teach." };
  }
  return createUpload(user.id, clip(input.name, 200), Number(input.size));
}

const authored = (user: PublicUser, course: string, title: string) => ({
  id: crypto.randomUUID(),
  course,
  title,
  authorId: user.id,
  authorName: user.name,
  createdAt: new Date().toISOString(),
});

export async function addMaterial(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await courseManager(field(formData, "course", 20));
  if (!ctx) return { error: "You can only post to courses you teach." };
  const title = field(formData, "title", 150);
  const description = field(formData, "description", 2000);
  const url = field(formData, "url", 500);
  if (!title) return { error: "Please add a title." };
  if (url && !/^https?:\/\/\S+$/i.test(url)) return { error: "Links must start with http:// or https://" };
  if (!formData.get("fileRef") && !url) return { error: "Attach a file or add a link." };
  const { file, error } = await storeOptionalFile(formData, ctx.user.id);
  if (error) return { error };

  await updateDb((db) => {
    db.materials.push({ ...authored(ctx.user, ctx.course, title), description, ...(file ? { file } : {}), ...(url ? { url } : {}) });
  });
  refresh(ctx.course);
  return { success: `"${title}" was posted to ${ctx.course}.` };
}

export async function deleteMaterial(id: string) {
  const user = await requireUser();
  const removed = await updateDb((db) => {
    const item = db.materials.find((m) => m.id === id);
    if (!item || !canManageCourse(user, item.course)) return null;
    db.materials = db.materials.filter((m) => m.id !== id);
    return item;
  });
  if (!removed) return;
  await deleteUploads([removed.file]);
  refresh(removed.course);
}

export async function addAssignment(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await courseManager(field(formData, "course", 20));
  if (!ctx) return { error: "You can only post to courses you teach." };
  const title = field(formData, "title", 150);
  const instructions = field(formData, "instructions", 5000);
  const due = field(formData, "due", 16);
  const points = Math.round(Number(field(formData, "points", 6) || 100));
  if (!title) return { error: "Please add a title." };
  if (!DUE_RE.test(due)) return { error: "Please choose a due date and time." };
  if (!Number.isFinite(points) || points < 0 || points > 1000) return { error: "Points must be between 0 and 1000." };
  const { file, error } = await storeOptionalFile(formData, ctx.user.id);
  if (error) return { error };

  await updateDb((db) => {
    db.assignments.push({ ...authored(ctx.user, ctx.course, title), instructions, due, points, ...(file ? { file } : {}) });
  });
  refresh(ctx.course);
  return { success: `Assignment "${title}" was posted to ${ctx.course}.` };
}

export async function deleteAssignment(id: string) {
  const user = await requireUser();
  const removed = await updateDb((db) => {
    const item = db.assignments.find((a) => a.id === id);
    if (!item || !canManageCourse(user, item.course)) return null;
    const submissions = db.submissions.filter((s) => s.assignmentId === id);
    db.assignments = db.assignments.filter((a) => a.id !== id);
    db.submissions = db.submissions.filter((s) => s.assignmentId !== id);
    return { course: item.course, files: [item.file, ...submissions.map((s) => s.file)] };
  });
  if (!removed) return;
  await deleteUploads(removed.files);
  refresh(removed.course);
}

export async function submitAssignment(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const assignmentId = field(formData, "assignmentId", 40);
  const note = field(formData, "note", 3000);
  if (!note && !formData.get("fileRef")) return { error: "Attach a file or write a note to submit." };

  const assignment = (await readDb()).assignments.find((a) => a.id === assignmentId);
  if (!assignment || !isEnrolled(user, assignment.course)) return { error: "You aren't enrolled in this course." };
  const { file, error } = await storeOptionalFile(formData, user.id);
  if (error) return { error };

  const replaced = await updateDb((db) => {
    const previous = db.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === user.id);
    db.submissions = db.submissions.filter((s) => s !== previous);
    db.submissions.push({
      id: crypto.randomUUID(),
      assignmentId,
      studentId: user.id,
      studentName: user.name,
      note,
      submittedAt: new Date().toISOString(),
      ...(file ?? previous?.file ? { file: file ?? previous?.file } : {}),
    });
    return file ? previous?.file : undefined;
  });
  await deleteUploads([replaced]);
  refresh(assignment.course);
  return { success: "Your work was submitted." };
}

export async function gradeSubmission(id: string, grade: string, feedback: string) {
  const user = await requireUser();
  const course = await updateDb((db) => {
    const submission = db.submissions.find((s) => s.id === id);
    const assignment = submission && db.assignments.find((a) => a.id === submission.assignmentId);
    if (!submission || !assignment || !canManageCourse(user, assignment.course)) return null;
    submission.grade = clip(grade, 20) || undefined;
    submission.feedback = clip(feedback, 2000) || undefined;
    return assignment.course;
  });
  if (course) refresh(course);
}

function cleanQuestions(raw: unknown): QuizQuestion[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 30) return null;
  const questions = raw.map((q) => {
    const options = (Array.isArray(q?.options) ? q.options : []).map((o: unknown) => clip(o, 300)).filter(Boolean).slice(0, 6);
    return { question: clip(q?.question, 1000), options, answer: Number(q?.answer), explanation: clip(q?.explanation, 1000) || undefined };
  });
  const valid = questions.every((q) => q.question && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length);
  return valid ? questions : null;
}

export async function addQuiz(input: { course: string; title: string; description: string; due: string; questions: QuizQuestion[] }): Promise<FormState> {
  const ctx = await courseManager(clip(input?.course, 20));
  if (!ctx) return { error: "You can only post to courses you teach." };
  const title = clip(input.title, 150);
  const due = clip(input.due, 16);
  if (!title) return { error: "Please give the quiz a title." };
  if (due && !DUE_RE.test(due)) return { error: "That due date isn't valid." };
  const questions = cleanQuestions(input.questions);
  if (!questions) return { error: "Every question needs text, at least two filled-in options, and a correct answer selected." };

  await updateDb((db) => {
    db.quizzes.push({ ...authored(ctx.user, ctx.course, title), description: clip(input.description, 2000), questions, ...(due ? { due } : {}) });
  });
  refresh(ctx.course);
  return { success: `Quiz "${title}" was published to ${ctx.course}.` };
}

export async function deleteQuiz(id: string) {
  const user = await requireUser();
  const course = await updateDb((db) => {
    const quiz = db.quizzes.find((q) => q.id === id);
    if (!quiz || !canManageCourse(user, quiz.course)) return null;
    db.quizzes = db.quizzes.filter((q) => q.id !== id);
    db.quizAttempts = db.quizAttempts.filter((t) => t.quizId !== id);
    return quiz.course;
  });
  if (course) refresh(course);
}

export async function submitQuiz(quizId: string, answers: number[]): Promise<{ error?: string; attempt?: QuizAttempt; review?: QuizQuestion[] }> {
  const user = await requireUser();
  const result = await updateDb((db) => {
    const quiz = db.quizzes.find((q) => q.id === quizId);
    if (!quiz || !isEnrolled(user, quiz.course)) return { error: "You aren't enrolled in this course." };
    const existing = db.quizAttempts.find((t) => t.quizId === quizId && t.studentId === user.id);
    if (existing) return { attempt: existing, review: quiz.questions, course: quiz.course };
    const picked = quiz.questions.map((_, i) => (Number.isInteger(answers?.[i]) ? Number(answers[i]) : -1));
    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      quizId,
      studentId: user.id,
      studentName: user.name,
      answers: picked,
      score: quiz.questions.filter((q, i) => q.answer === picked[i]).length,
      total: quiz.questions.length,
      submittedAt: new Date().toISOString(),
    };
    db.quizAttempts.push(attempt);
    return { attempt, review: quiz.questions, course: quiz.course };
  });
  if ("course" in result && result.course) refresh(result.course);
  return { error: result.error, attempt: result.attempt, review: result.review };
}

export async function addAnnouncement(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await courseManager(field(formData, "course", 20));
  if (!ctx) return { error: "You can only post to courses you teach." };
  const title = field(formData, "title", 150);
  const body = field(formData, "body", 3000);
  if (!title || !body) return { error: "Add a title and a message." };
  await updateDb((db) => {
    db.announcements.push({ ...authored(ctx.user, ctx.course, title), body });
  });
  refresh(ctx.course);
  return { success: "Announcement posted." };
}

export async function deleteAnnouncement(id: string) {
  const item = (await readDb()).announcements.find((a) => a.id === id);
  if (!item || !(await courseManager(item.course))) return;
  await updateDb((db) => {
    db.announcements = db.announcements.filter((a) => a.id !== id);
  });
  refresh(item.course);
}

export async function addStudyPlan(input: { course: string; title: string; description: string; studentId: string; tasks: { text: string; due: string }[] }): Promise<FormState> {
  const ctx = await courseManager(clip(input?.course, 20));
  if (!ctx) return { error: "You can only post to courses you teach." };
  const title = clip(input.title, 150);
  if (!title) return { error: "Give the plan a title." };
  const tasks: PlanTask[] = (Array.isArray(input.tasks) ? input.tasks : [])
    .slice(0, 40)
    .map((t) => ({ id: crypto.randomUUID(), text: clip(t?.text, 200), due: /^\d{4}-\d{2}-\d{2}$/.test(clip(t?.due, 10)) ? clip(t.due, 10) : undefined }))
    .filter((t) => t.text);
  if (!tasks.length) return { error: "Add at least one task." };
  const db = await readDb();
  const studentId = clip(input.studentId, 60);
  const student = studentId ? db.users.find((u) => u.id === studentId && u.role === "student" && (u.courses ?? []).includes(ctx.course)) : undefined;
  if (studentId && !student) return { error: "That student isn't enrolled in this course." };
  await updateDb((db) => {
    db.plans.push({ ...authored(ctx.user, ctx.course, title), description: clip(input.description, 2000), ...(student ? { studentId: student.id, studentName: student.name } : {}), tasks, done: {} });
  });
  refresh(ctx.course);
  return { success: student ? `Plan sent to ${student.name}.` : "Plan posted to the course." };
}

export async function deleteStudyPlan(id: string) {
  const item = (await readDb()).plans.find((p) => p.id === id);
  if (!item || !(await courseManager(item.course))) return;
  await updateDb((db) => {
    db.plans = db.plans.filter((p) => p.id !== id);
  });
  refresh(item.course);
}

export async function togglePlanTask(planId: string, taskId: string, done: boolean): Promise<{ error?: string }> {
  const user = await requireUser();
  const ok = await updateDb((db) => {
    const plan = db.plans.find((p) => p.id === planId);
    if (!plan || !isEnrolled(user, plan.course) || (plan.studentId && plan.studentId !== user.id) || !plan.tasks.some((t) => t.id === taskId)) return false;
    const current = new Set(plan.done[user.id] ?? []);
    if (done) current.add(taskId);
    else current.delete(taskId);
    plan.done = { ...plan.done, [user.id]: [...current] };
    return true;
  });
  if (!ok) return { error: "You can't update this plan." };
  refresh((await readDb()).plans.find((p) => p.id === planId)!.course);
  return {};
}
