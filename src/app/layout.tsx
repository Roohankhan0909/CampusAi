import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusAI — Student Dashboard",
  description: "AI study assistant, campus helper, and planner in one dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
