import type { Metadata } from "next";
import AdminPanel from "@/components/admin/AdminPanel";
import { requireAdmin } from "@/lib/auth";
import { readDb, toPublicUser } from "@/lib/db";

export const metadata: Metadata = { title: "Admin — CampusAI" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const db = await readDb();
  return <AdminPanel admin={admin} users={db.users.map(toPublicUser)} campus={db.campus} />;
}
