"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { loadActiveSailingPref, saveActiveSailingPref } from "@/lib/activeSailingPref";
import { sailingDateKey } from "@/lib/sailingLabel";
import SailingSwitcher from "@/components/SailingSwitcher";
import SailingHeaderCard from "@/components/board/SailingHeaderCard";
import PassengerBoard from "@/components/board/PassengerBoard";
import type { BoardData } from "@/lib/boardData";

/** Owns the sailing shown on the Passengers screen client-side, so picking a
 * different one of your own sailings from the dropdown re-renders the hero
 * and passenger list in place - no navigation, same as Chat's switcher.
 * `initial` is whatever app/sailing/[id]/board/page.tsx server-rendered for
 * the URL's sailing id; switching to another one re-fetches its board data
 * from /api/board/[id] (the same data, just reachable from the client). */
export default function PassengersScreen({ initial }: { initial: BoardData }) {
  const { userId, mySailings } = useAuth();
  const [boardData, setBoardData] = useState(initial);
  const [switching, setSwitching] = useState(false);

  async function selectSailing(id: string) {
    if (id === boardData.sailingId || switching) return;
    setSwitching(true);
    try {
      const res = await fetch(`/api/board/${id}`);
      if (!res.ok) return;
      const data: BoardData = await res.json();
      setBoardData(data);
      if (userId) saveActiveSailingPref(userId, id);
    } finally {
      setSwitching(false);
    }
  }

  // If a different sailing was made active elsewhere (e.g. switched in Chat
  // right before navigating here), pick that up instead of always trusting
  // the URL - but only when the visitor has actually joined the URL's
  // sailing to begin with. An invite link for a sailing you haven't joined
  // should always show that sailing, never silently swap to another one.
  useEffect(() => {
    if (!userId) return;
    if (!mySailings.some((s) => s.id === initial.sailingId)) return;
    const pref = loadActiveSailingPref(userId);
    if (!pref || pref === initial.sailingId) return;
    if (!mySailings.some((s) => s.id === pref)) return;
    let cancelled = false;
    (async () => {
      setSwitching(true);
      try {
        const res = await fetch(`/api/board/${pref}`);
        if (cancelled || !res.ok) return;
        const data: BoardData = await res.json();
        if (cancelled) return;
        setBoardData(data);
      } finally {
        if (!cancelled) setSwitching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Deliberately mount-only - later switches go through selectSailing()
    // directly, triggered by the dropdown itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const orderedSailings = [...mySailings].sort((a, b) =>
    sailingDateKey(a.id).localeCompare(sailingDateKey(b.id))
  );

  return (
    <main className="pt-[62px]">
      <div className="px-4 pt-3.5 sm:px-8 md:px-12">
        <div className="mx-auto max-w-[1000px]">
          <SailingSwitcher sailings={orderedSailings} activeId={boardData.sailingId} onSelect={selectSailing} />
          <div className={switching ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <SailingHeaderCard
              sailingId={boardData.sailingId}
              lineLabel={boardData.lineLabel}
              shipName={boardData.shipName}
              dateLabel={boardData.dateLabel}
              port={boardData.port}
              countdown={boardData.countdown}
            />
          </div>
        </div>
      </div>

      <div className={switching ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
        <PassengerBoard
          key={boardData.sailingId}
          sailingId={boardData.sailingId}
          shipName={boardData.shipName}
          dateLabel={boardData.dateLabel}
          passengers={boardData.passengers}
        />
      </div>
    </main>
  );
}
