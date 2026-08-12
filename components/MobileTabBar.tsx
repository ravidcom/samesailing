"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function ShipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={23} height={23}>
      <path d="M3 14l9-3.5 9 3.5-1.5 5.4a2 2 0 0 1-1.9 1.4H6.4a2 2 0 0 1-1.9-1.4L3 14z" />
      <path d="M12 10.5V4M8.5 6h7" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={23} height={23}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 5.4a3 3 0 0 1 0 5.2" />
      <path d="M18 14.6c2 .5 3 2 3 4.9" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={23} height={23}>
      <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.4A8 8 0 1 1 21 11.5z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={23} height={23}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.8 3.4-5.8 7.5-5.8s7.5 2 7.5 5.8" />
    </svg>
  );
}

export default function MobileTabBar() {
  const { loggedIn, mySailings } = useAuth();
  const pathname = usePathname();

  if (!loggedIn) return null;

  // The prototype this is ported from assumed one global "current" sailing;
  // this app lets you join up to 5. With exactly one joined sailing,
  // Passengers can go straight to its board — with zero or several, there's
  // no single sailing to pick, so it goes to the dashboard where every
  // sailing card has its own Passengers link.
  const passengersHref = mySailings.length === 1 ? `/sailing/${mySailings[0].id}/board` : "/dashboard";

  const tabs = [
    { key: "sailings", label: "Sailings", href: "/dashboard", icon: <ShipIcon />, active: pathname === "/dashboard" },
    { key: "passengers", label: "Passengers", href: passengersHref, icon: <PeopleIcon />, active: pathname.endsWith("/board") },
    { key: "chat", label: "Chat", href: "/chat", icon: <ChatIcon />, active: pathname === "/chat" },
    { key: "profile", label: "Profile", href: "/dashboard", icon: <ProfileIcon />, active: pathname === "/dashboard" },
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
            {t.icon}
            {t.label}
          </Link>
        ))}
      </nav>
      {/* Spacer so the fixed bar doesn't cover the last bit of page content. */}
      <div className="h-[60px] md:hidden" aria-hidden="true" />
    </>
  );
}
