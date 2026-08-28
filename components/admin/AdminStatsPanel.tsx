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

const TILES: { key: keyof Stats; label: string }[] = [
  { key: "total_users", label: "Total users" },
  { key: "total_sailings", label: "Sailings with a member" },
  { key: "total_group_messages", label: "Group messages" },
  { key: "total_dm_messages", label: "Direct messages" },
  { key: "open_reports", label: "Open reports" },
];

export default function AdminStatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("admin_stats")
      .single()
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message);
        else setStats(data as Stats);
      });
  }, []);

  if (error) return <div className="text-sm text-[#d9482e]">{error}</div>;
  if (!stats) return <div className="text-sm text-muted">Loading…</div>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {TILES.map((t) => (
        <div key={t.key} className="rounded-[16px] border border-[#e4f0f1] bg-white p-4">
          <div className="font-display text-2xl font-bold text-charcoal">{stats[t.key]}</div>
          <div className="mt-1 text-xs text-muted">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
