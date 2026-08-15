"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function ShipIcon({ active }: { active: boolean }) {
  const size = active ? 21 : 23;
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M3 14l9-3.5 9 3.5-1.5 5.4a2 2 0 0 1-1.9 1.4H6.4a2 2 0 0 1-1.9-1.4L3 14z" />
      <path d="M12 10.5V4M8.5 6h7" />
    </svg>
  );
}

function PeopleIcon({ active }: { active: boolean }) {
  const size = active ? 21 : 23;
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 5.4a3 3 0 0 1 0 5.2" />
      <path d="M18 14.6c2 .5 3 2 3 4.9" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  const size = active ? 21 : 23;
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.4A8 8 0 1 1 21 11.5z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const size = active ? 21 : 23;
  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.8 3.4-5.8 7.5-5.8s7.5 2 7.5 5.8" />
    </svg>
  );
}

export default function MobileTabBar() {
  const { loggedIn, mySailings, unreadCount, profileModalOpen } = useAuth();
  const pathname = usePathname();

  if (!loggedIn) return null;

  // The prototype this is ported from assumed one global "current" sailing;
  // this app lets you join up to 5. With exactly one joined sailing,
  // Passengers can go straight to its board — with zero or several, there's
  // no single sailing to pick, so it goes to the dashboard where every
  // sailing card has its own Passengers link.
  const passengersHref = mySailings.length === 1 ? `/sailing/${mySailings[0].id}/board` : "/dashboard";

  // Profile has no separate route — it lives at the top of the dashboard.
  // Rather than linking to the same URL as Sailings (which made both tabs
  // indistinguishable and highlighted at once), Profile links to a
  // ?edit=1 variant that auto-opens the account-edit modal (tracked as
  // shared AuthContext state — reading useSearchParams() directly here
  // instead would force this component's Suspense boundary to diverge
  // between the statically-prerendered shell and a real request's query
  // string, which is what caused a hydration mismatch on every page load).
  const tabs = [
    { key: "sailings", label: "Sailings", href: "/dashboard", Icon: ShipIcon, active: pathname === "/dashboard" && !profileModalOpen, badgeCount: 0 },
    { key: "passengers", label: "Passengers", href: passengersHref, Icon: PeopleIcon, active: pathname.endsWith("/board"), badgeCount: 0 },
    { key: "chat", label: "Chat", href: "/chat", Icon: ChatIcon, active: pathname === "/chat", badgeCount: unreadCount },
    { key: "profile", label: "Profile", href: "/dashboard?edit=1", Icon: ProfileIcon, active: pathname === "/dashboard" && profileModalOpen, badgeCount: 0 },
  ];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-[150] flex h-[60px] items-stretch justify-around border-t border-[#d8ebec] bg-white md:hidden">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 font-sans text-[10px] font-medium ${
              t.active ? "font-bold text-teal" : "text-[#7a9599]"
            }`}
          >
            {/* Icon sits in a pill; the pill fills teal-tint only on the active tab (option 2a). */}
            <span
              className={`relative flex h-[26px] w-[46px] items-center justify-center rounded-full transition-colors ${
                t.active ? "bg-teal-tint" : ""
              }`}
            >
              <t.Icon active={t.active} />
              {t.badgeCount > 0 ? (
                <span
                  className="absolute -top-[3px] right-[3px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-coral px-1 text-[10px] font-bold leading-none text-white"
                  aria-label={`${t.badgeCount} unread messages`}
                >
                  {t.badgeCount > 9 ? "9+" : t.badgeCount}
                </span>
              ) : null}
            </span>
            {t.label}
          </Link>
        ))}
      </nav>
      {/* Spacer so the fixed bar doesn't cover the last bit of page content. */}
      <div className="h-[60px] md:hidden" aria-hidden="true" />
    </>
  );
}
