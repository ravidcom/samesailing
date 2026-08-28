"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Stats = {
  total_users: number;
  total_sailings: number;
  total_group_messages: number;
  total_dm_messages: number;
  open_reports: number;
};

type NewUsers = {
  today: number;
  yesterday: number;
  last_7_days: number;
  last_30_days: number;
};

type PopularSailing = {
  sailing_id: string;
  ship_name: string;
  sail_date: string;
  member_count: number;
  message_count: number;
};

const TILES: { key: keyof Stats; label: string }[] = [
  { key: "total_users", label: "Total users" },
  { key: "total_sailings", label: "Sailings with a member" },
  { key: "total_group_messages", label: "Group messages" },
  { key: "total_dm_messages", label: "Direct messages" },
  { key: "open_reports", label: "Open reports" },
];

const NEW_USER_TILES: { key: keyof NewUsers; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_7_days", label: "Last 7 days" },
  { key: "last_30_days", label: "Last 30 days" },
];

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[16px] border border-[#e4f0f1] bg-white p-4">
      <div className="font-display text-2xl font-bold text-charcoal">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

export default function AdminStatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [newUsers, setNewUsers] = useState<NewUsers | null>(null);
  const [sailings, setSailings] = useState<PopularSailing[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.rpc("admin_stats").single(),
      supabase.rpc("admin_new_users").single(),
      supabase.rpc("admin_popular_sailings"),
    ]).then(([statsRes, newUsersRes, sailingsRes]) => {
      if (cancelled) return;
      const firstError = statsRes.error ?? newUsersRes.error ?? sailingsRes.error;
      if (firstError) {
        setError(firstError.message);
        return;
      }
      setStats(statsRes.data as Stats);
      setNewUsers(newUsersRes.data as NewUsers);
      setSailings(sailingsRes.data as PopularSailing[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="text-sm text-[#d9482e]">{error}</div>;
  if (!stats || !newUsers || !sailings) return <div className="text-sm text-muted">Loading…</div>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TILES.map((t) => (
          <StatTile key={t.key} value={stats[t.key]} label={t.label} />
        ))}
      </div>

      <div className="mt-6 mb-3 font-display text-lg font-bold text-charcoal">New users</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NEW_USER_TILES.map((t) => (
          <StatTile key={t.key} value={newUsers[t.key]} label={t.label} />
        ))}
      </div>

      <div className="mt-6 mb-3 font-display text-lg font-bold text-charcoal">Most popular sailings</div>
      {sailings.length === 0 ? (
        <div className="rounded-[16px] border-[1.5px] border-dashed border-border bg-input px-6 py-8 text-center text-sm text-muted">
          Nothing here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-[#e4f0f1] bg-white">
          {sailings.map((s, i) => (
            <div
              key={s.sailing_id}
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                i < sailings.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-charcoal">{s.ship_name}</div>
                <div className="text-xs text-muted-2">
                  {s.sail_date} · {s.sailing_id}
                </div>
              </div>
              <div className="flex shrink-0 gap-5 text-right">
                <div>
                  <div className="text-sm font-bold text-charcoal">{s.member_count}</div>
                  <div className="text-[10.5px] text-muted-2">members</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-charcoal">{s.message_count}</div>
                  <div className="text-[10.5px] text-muted-2">messages</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
