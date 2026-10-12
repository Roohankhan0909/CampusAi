"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => <div className="flex min-h-screen items-center justify-center text-slate-400">Loading CampusAI…</div>,
});

export default function ClientDashboard() {
  return <Dashboard />;
}
