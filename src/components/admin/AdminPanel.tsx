"use client";

import { useState } from "react";
import type { PublicUser, StoredCampusEntry } from "@/lib/types";
import Avatar from "../Avatar";
import PortalHeader from "../PortalHeader";
import RoleBadge from "../RoleBadge";
import CampusManager from "./CampusManager";
import UserManager from "./UserManager";

type Section = "overview" | "users" | "campus";

export default function AdminPanel({ admin, users, campus }: { admin: PublicUser; users: PublicUser[]; campus: StoredCampusEntry[] }) {
  const [section, setSection] = useState<Section>("overview");

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = Date.now() - 7 * 86400000;
  const stats = [
    { label: "Total users", value: users.length },
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
            <h1 className="text-2xl font-bold">Admin panel</h1>
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
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${section === t.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {section === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-7">
              {stats.map((s) => (
                <div key={s.label} className="card p-4">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
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
