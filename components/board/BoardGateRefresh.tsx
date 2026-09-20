"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** The server can't tell a member with an expired access-token cookie from
 * a stranger, so it renders the gate for both. Once the browser's own
 * session (which refreshes itself) shows this sailing among the viewer's
 * own, re-request the page so they get the real board. Carries no member
 * data - it only compares the sailing id it was given. */
export default function BoardGateRefresh({ sailingId }: { sailingId: string }) {
  const router = useRouter();
  const { mySailings } = useAuth();
  const isMember = mySailings.some((s) => s.id === sailingId);
  useEffect(() => {
    if (isMember) router.refresh();
  }, [isMember, router]);
  return null;
}
