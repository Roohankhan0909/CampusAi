import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import CourseManager from "@/components/course/CourseManager";
import { requireRole } from "@/lib/auth";
import { canManageCourse, normalizeCourse, teacherCourseWork } from "@/lib/course";
import { readDb, toPublicUser } from "@/lib/db";
import { streaksFor } from "@/lib/streaks";

type Props = { params: Promise<{ code: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${normalizeCourse(decodeURIComponent((await params).code))} — CampusAI` };
}

export default async function CoursePage({ params }: Props) {
  const user = await requireRole("teacher", "admin");
  const course = normalizeCourse(decodeURIComponent((await params).code));
  if (!course || !canManageCourse(user, course)) redirect(user.role === "admin" ? "/admin" : "/teacher");
  const db = await readDb();
  const students = db.users.map(toPublicUser).filter((u) => u.role === "student" && u.status === "active" && u.courses.includes(course));
  const streaks = Object.fromEntries(
    students.map((s) => {
      const { open, study } = streaksFor(db.activity, s.id);
      return [s.id, { open, study }];
    }),
  );
  const home = user.role === "admin" ? { href: "/admin", label: "Admin panel" } : { href: "/teacher", label: "Teacher portal" };
  return (
    <div className="min-h-screen">
      <PortalHeader user={user} badge={user.role} links={[home, { href: "/profile", label: "My profile" }]} />
      <CourseManager course={course} work={teacherCourseWork(db, course)} students={students} streaks={streaks} back={home} />
    </div>
  );
}
