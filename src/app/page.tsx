import ClientDashboard from "@/components/ClientDashboard";
import { requireUser } from "@/lib/auth";
import { studentCourseWork } from "@/lib/course";
import { sharedCourses } from "@/lib/courses";
import { readDb, toPublicUser } from "@/lib/db";
import { publicationsView } from "@/lib/publications";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const db = await readDb();
  const { campus, users } = db;
  const teachers = users.map(toPublicUser).filter((u) => u.role === "teacher" && u.status === "active" && u.id !== user.id && sharedCourses(u.courses, user.courses).length > 0);
  return <ClientDashboard user={user} campus={campus} teachers={teachers} work={studentCourseWork(db, user)} publications={publicationsView(db, user)} />;
}
