"use client";

import { useState, useTransition } from "react";
import { deleteUser, setUserRole } from "@/app/actions/admin";
import type { PublicUser } from "@/lib/types";

export default function UserManager({ users, currentAdminId }: { users: PublicUser[]; currentAdminId: string }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const q = query.toLowerCase();
  const shown = users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="section-title">Users</h3>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email…" className="input w-64" aria-label="Search users" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500 uppercase">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">Joined</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody className={pending ? "opacity-60" : ""}>
            {shown.map((u) => {
              const self = u.id === currentAdminId;
              return (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium">
                    {u.name}
                    {self && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{u.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {!self && (
                      <>
                        <button
                          disabled={pending}
                          onClick={() => startTransition(() => setUserRole(u.id, u.role === "admin" ? "student" : "admin"))}
                          className="mr-3 text-xs font-medium text-indigo-600 hover:underline"
                        >
                          {u.role === "admin" ? "Make student" : "Make admin"}
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`Delete ${u.name}'s account?`)) startTransition(() => deleteUser(u.id));
                          }}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </>
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
  );
}
