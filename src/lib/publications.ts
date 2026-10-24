import { sharedCourses } from "./courses";
import type { Db } from "./db";
import { toPublicUser } from "./db";
import type { Publication, PublicationsView, PublicUser } from "./types";

export const PUBLICATION_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export const canReview = (user: PublicUser, p: Publication) => user.role === "admin" || (user.role === "teacher" && p.reviewerId === user.id);

export const canViewPublication = (user: PublicUser, p: Publication) => p.status === "approved" || p.authorId === user.id || canReview(user, p);

export function reviewersFor(db: Db, user: PublicUser): { id: string; name: string }[] {
  const teachers =
    user.role === "student"
      ? db.users.map(toPublicUser).filter((t) => t.role === "teacher" && t.status === "active" && sharedCourses(t.courses, user.courses).length > 0)
      : [];
  return [{ id: "admin", name: "Admin office" }, ...teachers.map((t) => ({ id: t.id, name: t.name }))];
}

export function publicationsView(db: Db, user: PublicUser): PublicationsView {
  const newest = [...db.publications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    library: newest.filter((p) => p.status === "approved"),
    mine: newest.filter((p) => p.authorId === user.id),
    toReview: newest.filter((p) => p.status === "pending" && (p.authorId !== user.id || user.role === "admin") && canReview(user, p)),
    reviewers: reviewersFor(db, user),
  };
}
