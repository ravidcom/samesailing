"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import LogoMark from "./LogoMark";
import { useAuth } from "@/lib/auth-context";

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 12L13 4v4C7 9 3 13 3 20c2-4 6-6 10-6v4l8-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const navLinkBase =
  "rounded-lg px-3 py-2 font-sans text-sm font-medium text-muted transition-all hover:bg-teal-tint hover:text-charcoal";
const navLinkActive = "bg-[#dcf0f1] text-teal-dark font-semibold hover:bg-[#dcf0f1] hover:text-teal-dark";

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, loggedIn, user, mySailings, hasUnreadMessages, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Same fallback as MobileTabBar's Passengers tab: there's no single
  // "right" sailing once you've joined more than one, but landing on a
  // board beats bouncing to the dashboard, which is what this link would
  // otherwise be indistinguishable from.
  const passengersHref = mySailings.length > 0 ? `/sailing/${mySailings[0].id}/board` : "/dashboard";

  const sailingsActive = pathname === "/dashboard";
  const passengersActive = pathname.endsWith("/board");
  const chatActive = pathname === "/chat";

  // Close on navigation — adjusted during render (not in an effect) since
  // this is reacting to a prop-like change (pathname), not synchronizing
  // with an external system.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // Close on outside click and Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function shareSite() {
    const url = "https://samesailing.com";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "SameSailing.com", url });
      } catch {
        // user dismissed the native share sheet — nothing to do
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-[200] flex h-[62px] items-center border-b border-border bg-nav-bg backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-[1000px] items-center justify-between px-3.5 md:px-10">
        <div className="flex items-center">
          <Link
            href="/"
            className="flex cursor-pointer items-center gap-[5px] whitespace-nowrap font-display text-[19.5px] font-bold text-charcoal md:text-2xl"
          >
            <LogoMark className="h-[33px] w-[33px] shrink-0" />
            <span>
              same<span className="text-teal">sailing</span>
            </span>
          </Link>
          {loggedIn ? (
            <div className="ml-[26px] hidden items-center gap-1 md:flex">
              <Link href="/dashboard" className={`${navLinkBase} ${sailingsActive ? navLinkActive : ""}`}>
                Sailings
              </Link>
              <Link href={passengersHref} className={`${navLinkBase} ${passengersActive ? navLinkActive : ""}`}>
                Passengers
              </Link>
              <Link href="/chat" className={`relative ${navLinkBase} ${chatActive ? navLinkActive : ""}`}>
                Chat
                {hasUnreadMessages ? (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-coral" aria-label="Unread messages" />
                ) : null}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1 md:gap-2.5">
          {loading ? null : loggedIn ? (
            <>
              {/* Mobile keeps the plain name + Sign out button (unchanged from
                  before this redesign) — the avatar chip + dropdown below is
                  desktop-only, matching the handoff's scope. */}
              <span className="truncate text-[13px] font-medium text-muted md:hidden">{user?.name}</span>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-lg px-2 py-1.5 font-sans text-[13px] font-medium text-muted transition-all hover:bg-teal-tint hover:text-charcoal md:px-3 md:text-sm"
                >
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  signOut();
                  router.push("/");
                }}
                className="rounded-full border-[1.5px] border-border px-2.5 py-1.5 font-sans text-[13px] font-medium text-muted transition-all hover:border-teal hover:text-teal md:hidden"
              >
                Sign out
              </button>

              <button
                type="button"
                onClick={shareSite}
                aria-label="Share SameSailing.com"
                title="Share SameSailing.com"
                className="hidden h-[38px] w-[38px] items-center justify-center rounded-full border-[1.5px] border-border text-muted transition-colors hover:border-teal hover:text-teal md:flex"
              >
                {shared ? <span className="text-xs font-bold text-teal">✓</span> : <ShareIcon />}
              </button>

              <div className="relative hidden md:block" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-[9px] rounded-full border-[1.5px] py-[5px] pr-3 pl-[5px] font-sans transition-colors ${
                    menuOpen ? "border-teal" : "border-border"
                  } hover:border-teal`}
                >
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#fdeadf] text-[15px]">
                    {user?.avatar}
                  </span>
                  <span className="max-w-[110px] truncate text-sm font-semibold text-charcoal">{user?.name}</span>
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute top-14 right-3.5 z-[210] w-[236px] rounded-[14px] border-[1.5px] border-border bg-white p-1.5 shadow-[0_20px_44px_-22px_rgba(14,80,88,0.5)] md:right-10"
                  >
                    <div className="px-3 pt-2.5 pb-[7px] text-[11px] font-semibold tracking-[.06em] text-[#8aa6aa] uppercase">
                      {user?.name}
                    </div>
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="block rounded-[9px] px-3 py-2.5 text-sm text-charcoal transition-colors hover:bg-[#f0f9f9]"
                    >
                      My profile
                    </Link>
                    <Link
                      href="/profile#notification-settings"
                      role="menuitem"
                      className="block rounded-[9px] px-3 py-2.5 text-sm text-charcoal transition-colors hover:bg-[#f0f9f9]"
                    >
                      Notification settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={shareSite}
                      className="block w-full rounded-[9px] px-3 py-2.5 text-left text-sm text-charcoal transition-colors hover:bg-[#f0f9f9]"
                    >
                      Share SameSailing.com
                    </button>
                    <div className="mx-2 my-[5px] h-px bg-[#eaf3f4]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        signOut();
                        router.push("/");
                      }}
                      className="block w-full rounded-[9px] px-3 py-2.5 text-left text-sm text-[#c9503b] transition-colors hover:bg-[#fdeae6]"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border-[1.5px] border-border px-3 py-1.5 font-sans text-[13px] font-medium text-muted transition-all hover:border-teal hover:text-teal md:rounded-lg md:border-0 md:px-3 md:py-2 md:text-sm md:hover:border-0 md:hover:bg-teal-tint md:hover:text-charcoal"
              >
                Sign in
              </Link>
              <Link
                href="/join"
                className="rounded-full border-none bg-teal px-[13px] py-[7px] font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark md:px-[18px] md:py-2 md:text-sm"
              >
                <span className="hidden md:inline">Join free</span>
                <span className="md:hidden">Join</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
