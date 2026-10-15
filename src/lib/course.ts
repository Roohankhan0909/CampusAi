import { parseCourses } from "./courses";
import type { Db } from "./db";
import type { FileRef, PublicUser, StudentCourseWork, TeacherCourseWork } from "./types";

export const normalizeCourse = (code: string) => parseCourses(code)[0] ?? "";

export function canManageCourse(user: PublicUser, course: string): boolean {
  return user.role === "admin" || (user.role === "teacher" && user.courses.includes(course));
}

export function isEnrolled(user: PublicUser, course: string): boolean {
  return user.role === "student" && user.courses.includes(course);
}

const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
const byDue = <T extends { due: string }>(a: T, b: T) => a.due.localeCompare(b.due);

export function studentCourseWork(db: Db, user: PublicUser): StudentCourseWork {
  const mine = (course: string) => isEnrolled(user, course);
  return {
    materials: db.materials.filter((m) => mine(m.course)).sort(newestFirst),
    assignments: db.assignments
      .filter((a) => mine(a.course))
      .sort(byDue)
      .map((a) => ({ ...a, submission: db.submissions.find((s) => s.assignmentId === a.id && s.studentId === user.id) })),
    quizzes: db.quizzes
      .filter((q) => mine(q.course))
      .sort(newestFirst)
      .map(({ questions, ...quiz }) => {
        const attempt = db.quizAttempts.find((t) => t.quizId === quiz.id && t.studentId === user.id);
        // Correct answers are only sent after the student has submitted.
        return { ...quiz, questions: questions.map(({ question, options }) => ({ question, options })), ...(attempt ? { attempt, review: questions } : {}) };
      }),
  };
}

export function teacherCourseWork(db: Db, course: string): TeacherCourseWork {
  return {
    materials: db.materials.filter((m) => m.course === course).sort(newestFirst),
    assignments: db.assignments
      .filter((a) => a.course === course)
      .sort(byDue)
      .map((a) => ({ ...a, submissions: db.submissions.filter((s) => s.assignmentId === a.id) })),
    quizzes: db.quizzes
      .filter((q) => q.course === course)
      .sort(newestFirst)
      .map((q) => ({ ...q, attempts: db.quizAttempts.filter((t) => t.quizId === q.id) })),
  };
}

export function findAccessibleFile(db: Db, user: PublicUser, fileId: string): FileRef | null {
  const canView = (course: string) => canManageCourse(user, course) || isEnrolled(user, course);
  for (const item of [...db.materials, ...db.assignments]) {
    if (item.file?.id === fileId) return canView(item.course) ? item.file : null;
  }
  const submission = db.submissions.find((s) => s.file?.id === fileId);
  if (!submission) return null;
  const assignment = db.assignments.find((a) => a.id === submission.assignmentId);
  const allowed = submission.studentId === user.id || (assignment && canManageCourse(user, assignment.course));
  return allowed ? submission.file! : null;
}
