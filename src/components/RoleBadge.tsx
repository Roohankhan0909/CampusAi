import type { Role } from "@/lib/types";

const STYLES: Record<Role, string> = {
  admin: "bg-slate-900 text-white",
  teacher: "bg-emerald-100 text-emerald-700",
  student: "bg-indigo-50 text-indigo-700",
};

export default function RoleBadge({ role }: { role: Role }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STYLES[role]}`}>{role}</span>;
}
