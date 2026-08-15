"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import SailingCard from "@/components/dashboard/SailingCard";
import EditProfileModal from "@/components/dashboard/EditProfileModal";
import NotificationSettings from "@/components/dashboard/NotificationSettings";
import NotificationLog from "@/components/dashboard/NotificationLog";
import { useAuth } from "@/lib/auth-context";

function DashboardContent() {
  const { loading, loggedIn, user, country, mySailings, profileModalOpen, showProfileModal } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");

  // Mirrors the modal (shared AuthContext state, so the mobile tab bar's
  // Profile tab can reflect it too) to the ?edit=1 param whenever it
  // changes. This has to be a real effect, not a render-time sync —
  // showProfileModal updates state that lives in AuthProvider, a different
  // component, and updating another component's state synchronously during
  // this component's render throws ("Cannot update a component while
  // rendering a different component").
  useEffect(() => {
    showProfileModal(editParam === "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam]);

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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-teal-tint text-2xl text-teal">
              {user?.avatar ?? "😊"}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-charcoal">{user?.name}</h1>
              <p className="text-sm text-muted-2">
                {user?.email}
                {country ? ` · ${country}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => showProfileModal(true)}
            className="rounded-xl border-[1.5px] border-border px-4 py-2 font-sans text-sm font-medium text-muted transition-colors hover:border-teal hover:text-teal"
          >
            ✏️ Edit profile
          </button>
        </div>

        <h2 className="mb-3 font-display text-lg font-bold text-charcoal">My cruises</h2>
        {mySailings.length === 0 ? (
          <div className="rounded-[16px] border-[1.5px] border-dashed border-border bg-input px-6 py-8 text-center text-sm text-muted">
            You haven&apos;t joined a sailing yet.{" "}
            <Link href="/" className="font-semibold text-teal">
              Search for one →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mySailings.map((s) => (
              <SailingCard key={s.id} sailing={s} />
            ))}
          </div>
        )}
        <div className="mt-3 text-xs text-muted-2">
          Max 2 sailings per ship · 5 total across all ships.
        </div>

        <Link
          href="/"
          className="mt-4.5 flex w-full items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#c5e2e4] bg-white px-5.5 py-4 font-sans text-sm text-muted-2 transition-colors hover:border-teal hover:text-teal"
        >
          <span className="text-xl">＋</span>
          <span>Find &amp; add another sailing</span>
        </Link>

        <NotificationLog />
        <NotificationSettings />
      </main>

      <EditProfileModal
        open={profileModalOpen}
        onClose={() => {
          showProfileModal(false);
          if (editParam === "1") router.replace("/dashboard");
        }}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
