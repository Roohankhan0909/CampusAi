import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { PublicUser } from "@/lib/types";
import Avatar from "./Avatar";
import Logo from "./Logo";

export default function PortalHeader({ user, badge, links }: { user: PublicUser; badge?: string; links: { href: string; label: string }[] }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold">CampusAI</span>
          {badge && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white uppercase">{badge}</span>}
        </Link>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-slate-100" aria-label="Account menu">
            <Avatar name={user.name} color={user.avatarColor} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm leading-tight font-medium">{user.name}</span>
              <span className="block text-xs leading-tight text-slate-500 capitalize">{user.role}</span>
            </span>
            <span className="text-xs text-slate-400 group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                {l.label}
              </Link>
            ))}
            <form action={logout} className="border-t border-slate-100">
              <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">Log out</button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
