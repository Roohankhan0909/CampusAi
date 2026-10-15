import type { Role } from "@/lib/types";

const STYLES: Record<Role, string> = {
  admin: "bg-indigo-600 text-[#0a0a0a]",
  teacher: "border border-indigo-400 text-indigo-700",
  student: "bg-slate-100 text-slate-700",
};

export default function RoleBadge({ role }: { role: Role }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STYLES[role]}`}>{role}</span>;
}
