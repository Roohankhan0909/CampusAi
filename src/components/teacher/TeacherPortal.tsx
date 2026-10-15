"use client";

import Link from "next/link";
import { useState } from "react";
import { sharedCourses } from "@/lib/courses";
import type { PublicUser } from "@/lib/types";
import Avatar from "../Avatar";

export default function TeacherPortal({ teacher, students, workload }: { teacher: PublicUser; students: PublicUser[]; workload: Record<string, { posts: number; toGrade: number }> }) {
  const [course, setCourse] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = query.toLowerCase();
  const shown = students
    .filter((s) => (course === "all" || s.courses.includes(course)) && (!q || `${s.name} ${s.email} ${s.department}`.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selected = students.find((s) => s.id === selectedId) ?? null;
  const counts = Object.fromEntries(teacher.courses.map((c) => [c, students.filter((s) => s.courses.includes(c)).length]));
  const weekAgo = Date.now() - 7 * 86400000;

  const stats = [
    { label: "Courses", value: teacher.courses.length },
    { label: "Students", value: students.length },
    { label: "New this week", value: students.filter((s) => new Date(s.createdAt).getTime() >= weekAgo).length },
    { label: "Largest class", value: teacher.courses.length ? Math.max(...Object.values(counts)) : 0 },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <section className="card relative flex flex-col gap-4 overflow-hidden border-indigo-200 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-indigo-600" />
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-indigo-500 uppercase">Teacher portal</p>
          <h1 className="mt-1 text-3xl font-semibold">Welcome, {teacher.name.split(" ")[0]}!</h1>
          {teacher.officeHours && <p className="mt-1 text-sm text-slate-500">Office hours: {teacher.officeHours}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile" className="btn-primary">
            Edit profile
          </Link>
          <Link href="/" className="btn-ghost">
            AI assistant
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </section>

      {teacher.courses.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="font-medium">You haven&apos;t added any courses yet.</p>
          <p className="mt-1 text-sm text-slate-500">Add the course codes you teach (e.g. CS101). Students enrolled in them will appear here.</p>
          <Link href="/profile" className="btn-primary mt-4 inline-block">
            Add my courses
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {teacher.courses.map((c) => (
              <div key={c} className={`card flex flex-col gap-3 p-4 transition ${course === c ? "border-indigo-400 bg-indigo-50" : ""}`}>
                <button onClick={() => setCourse(course === c ? "all" : c)} className="text-left" title="Filter students by this course">
                  <p className="text-lg font-semibold">{c}</p>
                  <p className="text-xs text-slate-500">
                    {counts[c]} student{counts[c] === 1 ? "" : "s"} · {workload[c]?.posts ?? 0} posted
                    {!!workload[c]?.toGrade && <span className="text-indigo-700"> · {workload[c].toGrade} to grade</span>}
                  </p>
                </button>
                <Link href={`/teacher/course/${encodeURIComponent(c)}`} className="btn-primary text-center text-xs">
                  Materials, assignments &amp; quizzes
                </Link>
              </div>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <section className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="section-title">{course === "all" ? "All my students" : `Students in ${course}`}</h3>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students…" className="input w-56" aria-label="Search students" />
              </div>
              <ul className="divide-y divide-slate-100">
                {shown.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setSelectedId(s.id)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left ${selectedId === s.id ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                      <Avatar name={s.name} color={s.avatarColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="truncate text-xs text-slate-500">{s.email}</p>
                      </div>
                      <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                        {sharedCourses(s.courses, teacher.courses).map((c) => (
                          <span key={c} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {c}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                ))}
                {shown.length === 0 && <li className="py-3 text-sm text-slate-400">No students found.</li>}
              </ul>
            </section>

            <section className="card h-fit p-5">
              {selected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.name} color={selected.avatarColor} size="lg" />
                    <div className="min-w-0">
                      <p className="text-lg font-semibold">{selected.name}</p>
                      <a href={`mailto:${selected.email}`} className="block truncate text-sm text-indigo-700 hover:underline">
                        {selected.email}
                      </a>
                      {selected.department && <p className="text-sm text-slate-500">{selected.department}</p>}
                    </div>
                  </div>
                  {selected.bio && <p className="text-sm whitespace-pre-wrap text-slate-600">{selected.bio}</p>}
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500 uppercase">Courses</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.courses.map((c) => (
                        <span key={c} className={`rounded-full px-2.5 py-1 text-xs font-medium ${teacher.courses.includes(c) ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"}`}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Joined {new Date(selected.createdAt).toLocaleDateString()}</p>
                  <a href={`mailto:${selected.email}`} className="btn-primary inline-block">
                    Email student
                  </a>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Select a student to see their profile.</p>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
