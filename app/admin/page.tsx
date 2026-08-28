"use client";

import { useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/lib/auth-context";
import AdminReportsPanel from "@/components/admin/AdminReportsPanel";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import AdminStatsPanel from "@/components/admin/AdminStatsPanel";

const TABS = [
  { id: "reports", label: "Reports" },
  { id: "users", label: "Users" },
  { id: "stats", label: "Stats" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  const { loading, loggedIn, isAdmin } = useAuth();
  const [tab, setTab] = useState<TabId>("reports");

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="pt-[62px]" />
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <NavBar />
        <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16 text-center">
          <div className="w-full max-w-[420px]">
            <h1 className="mb-3 font-display text-2xl font-bold text-charcoal">Sign in required</h1>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-teal px-6 py-3 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
            >
              Sign in →
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <NavBar />
        <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16 text-center">
          <div className="w-full max-w-[420px]">
            <h1 className="font-display text-2xl font-bold text-charcoal">Not authorized</h1>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-[820px] px-4 pt-[100px] pb-16">
        <h1 className="mb-6 font-display text-xl font-bold text-charcoal">Admin</h1>

        <div className="mb-6 flex gap-1.5 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3.5 py-2.5 font-sans text-sm font-semibold transition-colors ${
                tab === t.id ? "border-teal text-teal" : "border-transparent text-muted hover:text-charcoal"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "reports" ? <AdminReportsPanel /> : null}
        {tab === "users" ? <AdminUsersPanel /> : null}
        {tab === "stats" ? <AdminStatsPanel /> : null}
      </main>
    </>
  );
}
