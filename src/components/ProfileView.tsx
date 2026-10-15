"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { changePassword, updateProfile } from "@/app/actions/profile";
import type { PublicUser } from "@/lib/types";
import Avatar, { AVATAR_CLASSES } from "./Avatar";
import RoleBadge from "./RoleBadge";

export default function ProfileView({ user, connections, backHref }: { user: PublicUser; connections: number; backHref: string }) {
  const [profileState, saveProfile, saving] = useActionState(updateProfile, undefined);
  const [pwState, savePassword, changing] = useActionState(changePassword, undefined);
  const [name, setName] = useState(user.name);
  const [color, setColor] = useState(user.avatarColor);
  const staff = user.role !== "student";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My profile</h1>
          <p className="text-sm text-slate-500">How you appear to {user.role === "student" ? "your teachers" : user.role === "teacher" ? "your students" : "other users"}.</p>
        </div>
        <Link href={backHref} className="btn-ghost">
          ← Back
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <aside className="card h-fit overflow-hidden">
          <div className="h-20 border-b border-indigo-200 bg-[radial-gradient(circle_at_30%_0%,#4a3c18,transparent_70%)]" />
          <div className="-mt-8 space-y-4 px-5 pb-5">
            <div className="w-fit rounded-full ring-4 ring-[#131313]">
              <Avatar name={name || user.name} color={color} size="lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{name || user.name}</h2>
                <RoleBadge role={user.role} />
              </div>
              <p className="text-sm text-slate-500">{user.email}</p>
              {user.department && <p className="text-sm text-slate-600">{user.department}</p>}
            </div>
            {user.bio && <p className="text-sm whitespace-pre-wrap text-slate-600">{user.bio}</p>}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Courses</dt>
                <dd className="text-lg font-semibold">{user.courses.length}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">{user.role === "student" ? "Teachers" : "Students"}</dt>
                <dd className="text-lg font-semibold">{connections}</dd>
              </div>
            </dl>
            {user.courses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {user.courses.map((c) => (
                  <span key={c} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {staff && user.officeHours && (
              <p className="text-sm text-slate-600">
                <span className="font-medium">Office hours:</span> {user.officeHours}
              </p>
            )}
            <p className="text-xs text-slate-400">Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
          </div>
        </aside>

        <div className="space-y-6">
          <form action={saveProfile} className="card space-y-4 p-5">
            <h3 className="section-title">Edit profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                <span>Full name</span>
                <input name="name" value={name} onChange={(e) => setName(e.target.value)} required className="input w-full font-normal" />
              </label>
              <label className="space-y-1 text-sm font-medium">
                <span>Department</span>
                <input name="department" defaultValue={user.department} placeholder="e.g. Computer Science" className="input w-full font-normal" />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium">
              <span>{user.role === "teacher" ? "Courses you teach" : user.role === "student" ? "Courses you're enrolled in" : "Courses"}</span>
              <input name="courses" defaultValue={user.courses.join(", ")} placeholder="e.g. CS101, MATH201" className="input w-full font-normal" />
              <span className="block text-xs font-normal text-slate-400">Comma-separated course codes. Students and teachers with the same course are connected.</span>
            </label>
            {staff && (
              <label className="block space-y-1 text-sm font-medium">
                <span>Office hours</span>
                <input name="officeHours" defaultValue={user.officeHours} placeholder="e.g. Mon & Wed 2-4 PM, Engineering 310" className="input w-full font-normal" />
              </label>
            )}
            <label className="block space-y-1 text-sm font-medium">
              <span>Bio</span>
              <textarea name="bio" defaultValue={user.bio} rows={4} placeholder="A few words about you…" className="input w-full resize-y font-normal" />
            </label>
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">Avatar color</legend>
              <div className="flex gap-2">
                {Object.entries(AVATAR_CLASSES).map(([c, cls]) => (
                  <label key={c} className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full ${cls} ${color === c ? "ring-2 ring-slate-900 ring-offset-2" : ""}`}>
                    <input type="radio" name="avatarColor" value={c} checked={color === c} onChange={() => setColor(c)} className="sr-only" aria-label={c} />
                  </label>
                ))}
              </div>
            </fieldset>
            {profileState?.error && <p className="text-sm text-red-600">{profileState.error}</p>}
            {profileState?.success && <p className="text-sm text-emerald-700">{profileState.success}</p>}
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>

          <form action={savePassword} className="card space-y-4 p-5">
            <h3 className="section-title">Change password</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <input name="current" type="password" required placeholder="Current password" autoComplete="current-password" className="input" aria-label="Current password" />
              <input name="next" type="password" required minLength={8} placeholder="New password" autoComplete="new-password" className="input" aria-label="New password" />
              <input name="confirm" type="password" required placeholder="Confirm new password" autoComplete="new-password" className="input" aria-label="Confirm new password" />
            </div>
            {pwState?.error && <p className="text-sm text-red-600">{pwState.error}</p>}
            {pwState?.success && <p className="text-sm text-emerald-700">{pwState.success}</p>}
            <button type="submit" disabled={changing} className="btn-primary">
              {changing ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
