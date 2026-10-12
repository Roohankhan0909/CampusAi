import type { DueStatus } from "@/lib/planner";

const STYLES: Record<DueStatus, string> = {
  done: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  soon: "bg-amber-50 text-amber-700",
  upcoming: "bg-slate-100 text-slate-600",
};

const LABELS: Record<DueStatus, string> = {
  done: "Done",
  overdue: "Overdue",
  soon: "Due soon",
  upcoming: "Upcoming",
};

export default function StatusBadge({ status }: { status: DueStatus }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}>{LABELS[status]}</span>;
}
