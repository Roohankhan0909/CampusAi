"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canManageCourse, isEnrolled, normalizeCourse } from "@/lib/course";
import { readDb, updateDb } from "@/lib/db";
import { checkUpload, deleteUploads, saveUpload, uploadedFile } from "@/lib/files";
import type { FileRef, FormState, PublicUser, QuizAttempt, QuizQuestion } from "@/lib/types";

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

async function storeOptionalFile(formData: FormData): Promise<{ file?: FileRef; error?: string }> {
  const file = uploadedFile(formData);
  if (!file) return {};
  const error = checkUpload(file);
  return error ? { error } : { file: await saveUpload(file) };
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
  if (!uploadedFile(formData) && !url) return { error: "Attach a file or add a link." };
  const { file, error } = await storeOptionalFile(formData);
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
  const { file, error } = await storeOptionalFile(formData);
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
  if (!note && !uploadedFile(formData)) return { error: "Attach a file or write a note to submit." };

  const assignment = (await readDb()).assignments.find((a) => a.id === assignmentId);
  if (!assignment || !isEnrolled(user, assignment.course)) return { error: "You aren't enrolled in this course." };
  const { file, error } = await storeOptionalFile(formData);
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
