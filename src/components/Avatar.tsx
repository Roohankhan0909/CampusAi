const COLORS: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  sky: "bg-sky-100 text-sky-700",
  slate: "bg-slate-200 text-slate-700",
};

const SIZES = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export default function Avatar({ name, color = "indigo", size = "md" }: { name: string; color?: string; size?: keyof typeof SIZES }) {
  return <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]} ${COLORS[color] ?? COLORS.indigo}`}>{initials(name)}</div>;
}

export const AVATAR_CLASSES = COLORS;
