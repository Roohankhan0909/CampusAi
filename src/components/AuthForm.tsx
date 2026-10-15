"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions/auth";
import Logo, { Wordmark } from "./Logo";

const ROLES_INFO = [
  { title: "Students", text: "Plan your week, revise with the study assistant, and find your teachers." },
  { title: "Teachers", text: "See the students enrolled in your courses and share your office hours." },
  { title: "Administrators", text: "Approve teachers, manage accounts, and keep campus information current." },
];

function Field({ id, label, hint, ...props }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input id={id} name={id} className="input w-full" {...props} />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const isLogin = mode === "login";
  const teacher = !isLogin && role === "teacher";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200 bg-[#0d0d0d] p-12 lg:flex">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,#3a2f12,transparent_65%)]" />
        <Link href="/login" className="relative flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <Wordmark className="text-3xl" />
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs font-medium tracking-[0.2em] text-indigo-500 uppercase">Student &amp; staff portal</p>
          <h1 className="mt-4 text-5xl leading-[1.05] font-semibold text-slate-900">
            Your campus,
            <br />
            <span className="text-indigo-600 italic">well organised.</span>
          </h1>
          <div className="gold-rule my-8 w-40" />
          <ul className="space-y-5">
            {ROLES_INFO.map((r) => (
              <li key={r.title}>
                <p className="font-serif text-xl font-semibold text-slate-800">{r.title}</p>
                <p className="text-sm leading-relaxed text-slate-500">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">© {new Date().getFullYear()} CampusAI · Made for students and their teachers</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo className="h-10 w-10" />
            <Wordmark className="text-3xl" />
          </div>
          <h2 className="text-4xl font-semibold">{isLogin ? "Sign in" : "Create an account"}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {isLogin ? "Students, teachers and administrators all sign in here. You'll be taken to your own portal." : "Choose whether you're joining as a student or a teacher."}
          </p>

          {state?.success ? (
            <div className="mt-8 space-y-4 rounded-xl border border-indigo-300 bg-indigo-50 p-5">
              <p className="font-serif text-xl font-semibold text-indigo-800">Request received</p>
              <p className="text-sm text-slate-600">{state.success}</p>
              <Link href="/login" className="btn-primary inline-block">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form action={action} className="mt-8 space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 rounded-xl border border-slate-300 p-1" role="radiogroup" aria-label="Account type">
                  {(["student", "teacher"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={role === r}
                      onClick={() => setRole(r)}
                      className={`rounded-lg py-2 text-sm font-medium transition ${role === r ? "bg-indigo-600 text-[#0a0a0a]" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      I&apos;m a {r}
                    </button>
                  ))}
                  <input type="hidden" name="role" value={role} />
                </div>
              )}
              {!isLogin && <Field id="name" label="Full name" required autoComplete="name" />}
              <Field id="email" label={teacher ? "Work email" : "Email"} type="email" required autoComplete="email" />
              <Field id="password" label="Password" type="password" required minLength={isLogin ? undefined : 8} autoComplete={isLogin ? "current-password" : "new-password"} />
              {!isLogin && <Field id="confirm" label="Confirm password" type="password" required autoComplete="new-password" />}
              {teacher && <Field id="department" label="Department" placeholder="e.g. Computer Science" />}
              {!isLogin && (
                <Field
                  id="courses"
                  label={teacher ? "Courses you teach" : "Your courses (optional)"}
                  placeholder="e.g. CS101, MATH201"
                  hint={teacher ? "Students enrolled in these courses will appear in your portal." : "Used to connect you with your teachers."}
                />
              )}
              {teacher && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Teacher accounts are reviewed by an administrator before you can sign in.</p>}
              {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
              <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
                {pending ? "Please wait…" : isLogin ? "Sign in" : teacher ? "Request teacher account" : "Create account"}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-slate-500">
            {isLogin ? "New here? " : "Already have an account? "}
            <Link href={isLogin ? "/signup" : "/login"} className="font-medium text-indigo-600 hover:underline">
              {isLogin ? "Create a student or teacher account" : "Sign in"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
