"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";
import Icon from "./Icon";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const isLogin = mode === "login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Icon name="sparkle" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-slate-500">{isLogin ? "Log in to your CampusAI dashboard" : "Join CampusAI to plan, study, and explore campus"}</p>
        </div>

        <form action={action} className="card space-y-4 p-6">
          {!isLogin && (
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <input id="name" name="name" required autoComplete="name" className="input w-full" />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input w-full" />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input id="password" name="password" type="password" required minLength={isLogin ? undefined : 8} autoComplete={isLogin ? "current-password" : "new-password"} className="input w-full" />
          </div>
          {!isLogin && (
            <div className="space-y-1">
              <label htmlFor="confirm" className="text-sm font-medium">
                Confirm password
              </label>
              <input id="confirm" name="confirm" type="password" required autoComplete="new-password" className="input w-full" />
            </div>
          )}
          {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Please wait…" : isLogin ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {isLogin ? "New to CampusAI? " : "Already have an account? "}
          <Link href={isLogin ? "/signup" : "/login"} className="font-medium text-indigo-600 hover:underline">
            {isLogin ? "Create an account" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
