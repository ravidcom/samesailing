"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import SailingCard from "@/components/dashboard/SailingCard";
import NotificationLog from "@/components/dashboard/NotificationLog";
import InstallAppButton from "@/components/ui/InstallAppButton";
import { useAuth } from "@/lib/auth-context";
import { sailingDateKey } from "@/lib/sailingLabel";

export default function DashboardPage() {
  const { loading, loggedIn, mySailings } = useAuth();
  const orderedSailings = [...mySailings].sort((a, b) =>
    sailingDateKey(a.id).localeCompare(sailingDateKey(b.id))
  );

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
            <h1 className="mb-3 font-display text-2xl font-bold text-charcoal">
              Sign in to see your dashboard
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-muted">
              You&apos;ll find your joined sailings and profile here once
              you&apos;re signed in.
            </p>
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

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-[820px] px-4 pt-[100px] pb-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-charcoal">My cruises</h1>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            ＋ Add a new sailing
          </Link>
        </div>

        <div className="mb-6">
          <InstallAppButton />
        </div>

        {orderedSailings.length === 0 ? (
          <div className="rounded-[16px] border-[1.5px] border-dashed border-border bg-input px-6 py-8 text-center text-sm text-muted">
            You haven&apos;t joined a sailing yet.{" "}
            <Link href="/" className="font-semibold text-teal">
              Search for one →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {orderedSailings.map((s) => (
              <SailingCard key={s.id} sailing={s} />
            ))}
          </div>
        )}

        <Link
          href="/"
          className="mt-4.5 flex w-full items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#c5e2e4] bg-white px-5.5 py-4 font-sans text-sm text-muted-2 transition-colors hover:border-teal hover:text-teal"
        >
          <span className="text-xl">＋</span>
          <span>Find &amp; add another sailing</span>
        </Link>

        <NotificationLog />
      </main>
    </>
  );
}
