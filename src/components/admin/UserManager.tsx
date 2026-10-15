"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createUser, deleteUser, setUserRole, updateUserDetails } from "@/app/actions/admin";
import type { PublicUser, Role } from "@/lib/types";
import Avatar from "../Avatar";
import RoleBadge from "../RoleBadge";

const ROLES: Role[] = ["student", "teacher", "admin"];

export default function UserManager({ users, currentAdminId }: { users: PublicUser[]; currentAdminId: string }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  const q = query.toLowerCase();
  const shown = users
    .filter((u) => (roleFilter === "all" || u.role === roleFilter) && (!q || `${u.name} ${u.email} ${u.courses.join(" ")}`.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      {showAdd && <AddUser onClose={() => setShowAdd(false)} />}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["all", ...ROLES] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${roleFilter === r ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {r === "all" ? "All" : `${r}s`} ({r === "all" ? users.length : users.filter((u) => u.role === r).length})
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, course…" className="input w-56" aria-label="Search users" />
            {!showAdd && (
              <button onClick={() => setShowAdd(true)} className="btn-primary">
                + Add user
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">User</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Courses</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className={pending ? "opacity-60" : ""}>
              {shown.map((u) => {
                const self = u.id === currentAdminId;
                return editingId === u.id ? (
                  <EditRow key={u.id} user={u} onClose={() => setEditingId(null)} />
                ) : (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} color={u.avatarColor} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium">
                            {u.name}
                            {self && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                          </p>
                          <p className="text-xs text-slate-500">
                            {u.email}
                            {u.department && ` · ${u.department}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {self ? (
                        <RoleBadge role={u.role} />
                      ) : (
                        <select
                          value={u.role}
                          disabled={pending}
                          onChange={(e) => startTransition(() => setUserRole(u.id, e.target.value as Role))}
                          className="input py-1 text-xs capitalize"
                          aria-label={`Role for ${u.name}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {u.courses.map((c) => (
                          <span key={c} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {c}
                          </span>
                        ))}
                        {u.courses.length === 0 && <span className="text-xs text-slate-300">None</span>}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditingId(u.id)} className="mr-3 text-xs font-medium text-indigo-600 hover:underline">
                        Edit
                      </button>
                      {!self && (
                        <button
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`Delete ${u.name}'s account?`)) startTransition(() => deleteUser(u.id));
                          }}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function EditRow({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const [form, setForm] = useState({ department: user.department, courses: user.courses.join(", "), officeHours: user.officeHours });
  const [pending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      await updateUserDetails(user.id, form);
      onClose();
    });
  return (
    <tr className="border-b border-slate-100 bg-indigo-50/40">
      <td colSpan={5} className="p-3">
        <p className="mb-2 text-sm font-medium">Edit {user.name}</p>
        <div className="grid gap-2 md:grid-cols-[1fr_1.5fr_1.5fr_auto]">
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department" className="input" aria-label="Department" />
          <input value={form.courses} onChange={(e) => setForm({ ...form, courses: e.target.value })} placeholder="Courses, e.g. CS101, MATH201" className="input" aria-label="Courses" />
          <input
            value={form.officeHours}
            onChange={(e) => setForm({ ...form, officeHours: e.target.value })}
            placeholder={user.role === "student" ? "Office hours (staff only)" : "Office hours"}
            disabled={user.role === "student"}
            className="input disabled:bg-slate-50"
            aria-label="Office hours"
          />
          <div className="flex gap-2">
            <button onClick={save} disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Save"}
            </button>
            <button onClick={onClose} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function AddUser({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(createUser, undefined);
  const [role, setRole] = useState<Role>("teacher");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.success) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <form key={formKey} action={action} className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Add user</h3>
        <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-700" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <input name="name" required placeholder="Full name" className="input" aria-label="Full name" />
        <input name="email" type="email" required placeholder="Email" className="input" aria-label="Email" />
        <input name="password" type="text" required minLength={8} placeholder="Temporary password" className="input" aria-label="Temporary password" />
        <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="input capitalize" aria-label="Role">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input name="department" placeholder="Department" className="input" aria-label="Department" />
        <input name="courses" placeholder={role === "teacher" ? "Courses taught, e.g. CS101" : "Courses, e.g. CS101"} className="input md:col-span-2" aria-label="Courses" />
        {role !== "student" ? <input name="officeHours" placeholder="Office hours" className="input" aria-label="Office hours" /> : <div />}
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success} Share the email and temporary password with them.</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Adding…" : "Add user"}
      </button>
    </form>
  );
}
