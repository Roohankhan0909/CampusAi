"use client";

import dynamic from "next/dynamic";
import type { PublicUser, StoredCampusEntry } from "@/lib/types";

const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => <div className="flex min-h-screen items-center justify-center text-slate-400">Loading CampusAI…</div>,
});

export default function ClientDashboard(props: { user: PublicUser; campus: StoredCampusEntry[] }) {
  return <Dashboard {...props} />;
}
