import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up — CampusAI" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return <AuthForm mode="signup" />;
}
