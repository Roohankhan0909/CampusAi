import ClientDashboard from "@/components/ClientDashboard";
import { requireUser } from "@/lib/auth";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const { campus } = await readDb();
  return <ClientDashboard user={user} campus={campus} />;
}
