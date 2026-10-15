import type { Metadata } from "next";
import PortalHeader from "@/components/PortalHeader";
import TeacherPortal from "@/components/teacher/TeacherPortal";
import { requireRole } from "@/lib/auth";
import { sharedCourses } from "@/lib/courses";
import { readDb, toPublicUser } from "@/lib/db";

export const metadata: Metadata = { title: "Teacher portal — CampusAI" };
export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const teacher = await requireRole("teacher");
  const db = await readDb();
  const workload = Object.fromEntries(
    teacher.courses.map((c) => {
      const assignments = db.assignments.filter((a) => a.course === c);
      const ids = new Set(assignments.map((a) => a.id));
      return [c, { posts: db.materials.filter((m) => m.course === c).length + assignments.length + db.quizzes.filter((q) => q.course === c).length, toGrade: db.submissions.filter((s) => ids.has(s.assignmentId) && !s.grade).length }];
    }),
  );
  const students = db.users.map(toPublicUser).filter((u) => u.role === "student" && u.status === "active" && sharedCourses(u.courses, teacher.courses).length > 0);
  return (
    <div className="min-h-screen">
      <PortalHeader
        user={teacher}
        badge="teacher"
        links={[
          { href: "/profile", label: "My profile" },
          { href: "/", label: "AI dashboard" },
        ]}
      />
      <TeacherPortal teacher={teacher} students={students} workload={workload} />
    </div>
  );
}
