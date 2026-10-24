"use client";

import { useState, useTransition } from "react";
import { approveUser, deleteUser } from "@/app/actions/admin";
import type { PublicationsView, PublicUser, StoredCampusEntry } from "@/lib/types";
import Publications from "../progress/Publications";
import Avatar from "../Avatar";
import PortalHeader from "../PortalHeader";
import RoleBadge from "../RoleBadge";
import CampusManager from "./CampusManager";
import UserManager from "./UserManager";

type Section = "overview" | "users" | "campus" | "publications";

export default function AdminPanel({ admin, users, campus, publications }: { admin: PublicUser; users: PublicUser[]; campus: StoredCampusEntry[]; publications: PublicationsView }) {
  const [section, setSection] = useState<Section>("overview");
  const [pendingAction, startTransition] = useTransition();
  const awaiting = users.filter((u) => u.status === "pending");

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = Date.now() - 7 * 86400000;
  const stats = [
    { label: "Total users", value: users.length },
    { label: "Awaiting approval", value: awaiting.length },
    { label: "Students", value: users.filter((u) => u.role === "student").length },
    { label: "Teachers", value: users.filter((u) => u.role === "teacher").length },
    { label: "Admins", value: users.filter((u) => u.role === "admin").length },
    { label: "New this week", value: users.filter((u) => new Date(u.createdAt).getTime() >= weekAgo).length },
    { label: "Campus entries", value: campus.length },
    { label: "Upcoming events", value: campus.filter((e) => e.category === "event" && (e.date ?? "") >= today).length },
  ];
  const recent = [...users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const tabs: { id: Section; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: `Users (${users.length})` },
    { id: "campus", label: `Campus content (${campus.length})` },
    { id: "publications", label: publications.toReview.length ? `Publications (${publications.toReview.length} to review)` : "Publications" },
  ];

  return (
    <div className="min-h-screen">
      <PortalHeader
        user={admin}
        badge="admin"
        links={[
          { href: "/profile", label: "My profile" },
          { href: "/", label: "Student dashboard" },
        ]}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Admin panel</h1>
            <p className="text-sm text-slate-500">Manage students, teachers, and the campus information students see.</p>
          </div>
          <a href="/profile" className="card flex items-center gap-3 p-3 pr-4 hover:border-indigo-200">
            <Avatar name={admin.name} color={admin.avatarColor} />
            <div>
              <p className="text-sm font-medium">{admin.name}</p>
              <p className="text-xs text-slate-500">{admin.department || "Administrator"} · Edit profile</p>
            </div>
          </a>
        </div>

        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${section === t.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {section === "publications" && <Publications view={publications} canDeleteAny />}

        {section === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="card p-4">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
            {awaiting.length > 0 && (
              <section className="card border-indigo-300 p-5">
                <h3 className="section-title mb-1">Teacher accounts awaiting approval</h3>
                <p className="mb-3 text-sm text-slate-500">These teachers signed up themselves. Approve them to let them log in and see their students.</p>
                <ul className={`divide-y divide-slate-100 ${pendingAction ? "opacity-60" : ""}`}>
                  {awaiting.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} color={u.avatarColor} size="sm" />
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-slate-500">
                            {u.email}
                            {u.department && ` · ${u.department}`}
                            {u.courses.length > 0 && ` · ${u.courses.join(", ")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={pendingAction} onClick={() => startTransition(() => approveUser(u.id))} className="btn-primary py-1.5">
                          Approve
                        </button>
                        <button
                          disabled={pendingAction}
                          onClick={() => {
                            if (confirm(`Reject and delete ${u.name}'s request?`)) startTransition(() => deleteUser(u.id));
                          }}
                          className="btn-ghost py-1.5"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="card p-5">
              <h3 className="section-title mb-3">Recent sign-ups</h3>
              <ul className="divide-y divide-slate-100">
                {recent.map((u) => (
                  <li key={u.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} color={u.avatarColor} size="sm" />
                      <div>
                        <p className="font-medium">
                          {u.name} <RoleBadge role={u.role} />
                          {u.status === "pending" && <span className="ml-1 text-xs text-amber-700">Pending</span>}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {section === "users" && <UserManager users={users} currentAdminId={admin.id} />}
        {section === "campus" && <CampusManager entries={campus} />}
      </main>
    </div>
  );
}
