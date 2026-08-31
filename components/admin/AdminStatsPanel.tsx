"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { selectInput, textInput } from "@/lib/formStyles";

type Stats = {
  total_users: number;
  total_sailings: number;
  total_group_messages: number;
  total_dm_messages: number;
  open_reports: number;
  total_account_deletions: number;
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
  { key: "total_account_deletions", label: "Accounts deleted" },
];

type RangePreset = "today" | "yesterday" | "7" | "14" | "28" | "custom";

const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7", label: "Last 7 days" },
  { key: "14", label: "Last 14 days" },
  { key: "28", label: "Last 28 days" },
  { key: "custom", label: "Custom range" },
];

/** Returns null only for "custom" before both dates are filled in - every
 * other preset always resolves. `end` is exclusive throughout. */
function resolveRange(
  preset: RangePreset,
  customStart: string,
  customEnd: string
): { start: Date; end: Date } | null {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { start: startOfToday, end: now };
    case "yesterday": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 1);
      return { start, end: startOfToday };
    }
    case "7":
    case "14":
    case "28":
      return { start: new Date(now.getTime() - Number(preset) * 86400000), end: now };
    case "custom": {
      if (!customStart || !customEnd) return null;
      const start = new Date(`${customStart}T00:00:00`);
      const end = new Date(`${customEnd}T00:00:00`);
      end.setDate(end.getDate() + 1); // the end date is inclusive
      return { start, end };
    }
  }
}

function StatTile({ value, label }: { value: number | "…"; label: string }) {
  return (
    <div className="rounded-[16px] border border-[#e4f0f1] bg-white p-4">
      <div className="font-display text-2xl font-bold text-charcoal">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

export default function AdminStatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sailings, setSailings] = useState<PopularSailing[] | null>(null);
  const [error, setError] = useState("");

  const [rangePreset, setRangePreset] = useState<RangePreset>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [newUsersCount, setNewUsersCount] = useState<number | null>(null);
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null);
  const [rangeFetchedKey, setRangeFetchedKey] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([supabase.rpc("admin_stats").single(), supabase.rpc("admin_popular_sailings")]).then(
      ([statsRes, sailingsRes]) => {
        if (cancelled) return;
        const firstError = statsRes.error ?? sailingsRes.error;
        if (firstError) {
          setError(firstError.message);
          return;
        }
        setStats(statsRes.data as Stats);
        setSailings(sailingsRes.data as PopularSailing[]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const range = useMemo(() => resolveRange(rangePreset, customStart, customEnd), [rangePreset, customStart, customEnd]);
  const rangeKey = range ? `${range.start.toISOString()}|${range.end.toISOString()}` : null;
  const rangeLoading = rangeKey !== null && rangeFetchedKey !== rangeKey;

  useEffect(() => {
    if (!range || !rangeKey) return;
    let cancelled = false;
    const supabase = createClient();
    const args = { range_start: range.start.toISOString(), range_end: range.end.toISOString() };
    Promise.all([supabase.rpc("admin_new_users_range", args), supabase.rpc("admin_active_users_range", args)]).then(
      ([newUsersRes, activeUsersRes]) => {
        if (cancelled) return;
        const firstError = newUsersRes.error ?? activeUsersRes.error;
        if (firstError) {
          setRangeError(firstError.message);
          setRangeFetchedKey(rangeKey);
          return;
        }
        setRangeError("");
        setNewUsersCount(newUsersRes.data as number);
        setActiveUsersCount(activeUsersRes.data as number);
        setRangeFetchedKey(rangeKey);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [range, rangeKey]);

  if (error) return <div className="text-sm text-[#d9482e]">{error}</div>;
  if (!stats || !sailings) return <div className="text-sm text-muted">Loading…</div>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TILES.map((t) => (
          <StatTile key={t.key} value={stats[t.key]} label={t.label} />
        ))}
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-display text-lg font-bold text-charcoal">Activity</div>
        <select
          value={rangePreset}
          onChange={(e) => setRangePreset(e.target.value as RangePreset)}
          className={selectInput + " w-auto"}
        >
          {RANGE_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {rangePreset === "custom" ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            max={customEnd || undefined}
            className={textInput + " w-auto"}
          />
          <span className="text-sm text-muted">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            min={customStart || undefined}
            className={textInput + " w-auto"}
          />
        </div>
      ) : null}
      {rangeError ? (
        <div className="text-sm text-[#d9482e]">{rangeError}</div>
      ) : !range ? (
        <div className="text-sm text-muted">Pick a start and end date.</div>
      ) : (
        <div className="grid max-w-[420px] grid-cols-2 gap-3">
          <StatTile
            value={rangeLoading || newUsersCount === null ? "…" : newUsersCount}
            label={`New users · ${RANGE_PRESETS.find((p) => p.key === rangePreset)?.label ?? ""}`}
          />
          <StatTile
            value={rangeLoading || activeUsersCount === null ? "…" : activeUsersCount}
            label={`Active users · ${RANGE_PRESETS.find((p) => p.key === rangePreset)?.label ?? ""}`}
          />
        </div>
      )}

      <div className="mt-6 mb-3 font-display text-lg font-bold text-charcoal">Most popular sailings</div>
      {sailings.length === 0 ? (
        <div className="rounded-[16px] border-[1.5px] border-dashed border-border bg-input px-6 py-8 text-center text-sm text-muted">
          Nothing here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-[#e4f0f1] bg-white">
          {sailings.map((s, i) => (
            <Link
              key={s.sailing_id}
              href={`/sailing/${s.sailing_id}/board`}
              className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-input ${
                i < sailings.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-teal">{s.ship_name}</div>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
