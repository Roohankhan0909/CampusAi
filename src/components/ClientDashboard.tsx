"use client";

import dynamic from "next/dynamic";
import type { PublicationsView, PublicUser, StoredCampusEntry, StudentCourseWork } from "@/lib/types";

const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => <div className="flex min-h-screen items-center justify-center text-slate-400">Loading CampusAI…</div>,
});

export default function ClientDashboard(props: { user: PublicUser; campus: StoredCampusEntry[]; teachers: PublicUser[]; work: StudentCourseWork; publications: PublicationsView }) {
  return <Dashboard {...props} />;
}
