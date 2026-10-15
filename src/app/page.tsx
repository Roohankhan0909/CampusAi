import ClientDashboard from "@/components/ClientDashboard";
import { requireUser } from "@/lib/auth";
import { sharedCourses } from "@/lib/courses";
import { readDb, toPublicUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const { campus, users } = await readDb();
  const teachers = users.map(toPublicUser).filter((u) => u.role === "teacher" && u.id !== user.id && sharedCourses(u.courses, user.courses).length > 0);
  return <ClientDashboard user={user} campus={campus} teachers={teachers} />;
}
