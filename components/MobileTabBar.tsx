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
  const { loggedIn, mySailings, unreadCount } = useAuth();
  const pathname = usePathname();

  if (!loggedIn) return null;

  // The prototype this is ported from assumed one global "current" sailing;
  // this app lets you join up to 5. There's no single "right" sailing to
  // pick when you've joined more than one, but landing on a board beats
  // bouncing to the dashboard — that's the Sailings tab's own page, so
  // doing that made Passengers look like a dead link that just redid what
  // Sailings already does. Defaulting to the first joined sailing at least
  // always shows *a* board; switching sailings from there is still one tap
  // away via each dashboard card's own Passengers link.
  const passengersHref = mySailings.length > 0 ? `/sailing/${mySailings[0].id}/board` : "/dashboard";

  const tabs = [
    { key: "sailings", label: "My Sailings", href: "/dashboard", Icon: ShipIcon, active: pathname === "/dashboard", badgeCount: 0 },
    { key: "passengers", label: "Passengers", href: passengersHref, Icon: PeopleIcon, active: pathname.endsWith("/board"), badgeCount: 0 },
    { key: "chat", label: "Chat", href: "/chat", Icon: ChatIcon, active: pathname === "/chat", badgeCount: unreadCount },
    { key: "profile", label: "Profile", href: "/profile", Icon: ProfileIcon, active: pathname === "/profile", badgeCount: 0 },
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
