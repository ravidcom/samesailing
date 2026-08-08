"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoMark from "./LogoMark";
import { useAuth } from "@/lib/auth-context";

export default function NavBar() {
  const router = useRouter();
  const { loading, loggedIn, user, mySailings, signOut } = useAuth();

  return (
    <nav className="fixed inset-x-0 top-0 z-[200] flex h-[62px] items-center justify-between border-b border-border bg-nav-bg px-3.5 backdrop-blur-md md:px-10">
      <Link
        href="/"
        className="flex cursor-pointer items-center gap-[7px] whitespace-nowrap font-display text-[16.5px] font-bold text-charcoal md:text-xl"
      >
        <LogoMark className="h-[25px] w-[25px] shrink-0" />
        same<span className="text-teal">sailing.com</span>
      </Link>

      <div className="flex items-center gap-1.5 md:gap-[5px]">
        {loading ? null : loggedIn ? (
          <>
            <span className="hidden text-[13px] font-medium text-muted md:inline">
              {user?.name}
            </span>
            {mySailings.length > 0 ? (
              <Link
                href="/chat"
                className="rounded-lg px-3 py-1.5 font-sans text-[13px] font-medium text-muted transition-all hover:bg-teal-tint hover:text-charcoal md:px-3 md:text-sm"
              >
                Chat
              </Link>
            ) : null}
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 font-sans text-[13px] font-medium text-muted transition-all hover:bg-teal-tint hover:text-charcoal md:px-3 md:text-sm"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push("/");
              }}
              className="rounded-full border-[1.5px] border-border px-3 py-1.5 font-sans text-[13px] font-medium text-muted transition-all hover:border-teal hover:text-teal md:px-4 md:text-sm"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full border-[1.5px] border-border px-3 py-1.5 font-sans text-[13px] font-medium text-muted transition-all hover:border-teal hover:text-teal md:px-4 md:text-sm"
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
    </nav>
  );
}
