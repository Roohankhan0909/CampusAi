import type { Metadata } from "next";
import PortalHeader from "@/components/PortalHeader";
import ProfileView from "@/components/ProfileView";
import { homeFor, requireUser } from "@/lib/auth";
import { sharedCourses } from "@/lib/courses";
import { readDb, toPublicUser } from "@/lib/db";

export const metadata: Metadata = { title: "My profile — CampusAI" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const users = (await readDb()).users.map(toPublicUser);
  const connections =
    user.role === "student"
      ? users.filter((u) => u.role === "teacher" && sharedCourses(u.courses, user.courses).length > 0).length
      : users.filter((u) => u.role === "student" && sharedCourses(u.courses, user.courses).length > 0).length;
  const links = [
    { href: homeFor(user.role), label: user.role === "admin" ? "Admin panel" : user.role === "teacher" ? "Teacher portal" : "Dashboard" },
    ...(user.role !== "student" ? [{ href: "/", label: "AI dashboard" }] : []),
  ];
  return (
    <div className="min-h-screen">
      <PortalHeader user={user} badge={user.role === "student" ? undefined : user.role} links={links} />
      <ProfileView user={user} connections={connections} backHref={homeFor(user.role)} />
    </div>
  );
}
