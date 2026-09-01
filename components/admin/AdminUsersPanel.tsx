"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/ui/Avatar";
import { selectInput } from "@/lib/formStyles";

type UserRow = {
  id: string;
  name: string;
  avatar: string;
  avatarTint: string;
  country: string;
  sailingCount: number;
  messageCount: number;
  messageCount7d: number;
  isAdmin: boolean;
  banned: boolean;
};

type ActivityRow = { user_id: string; message_count: number; message_count_7d: number };

type SortKey = "active7d" | "sailings" | "messages";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "active7d", label: "Most active (7 days)" },
  { key: "sailings", label: "Most sailings" },
  { key: "messages", label: "Most messages" },
];

export default function AdminUsersPanel() {
  const { userId } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("active7d");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("id,name,avatar,avatar_tint,country"),
      supabase.from("joined_sailings").select("user_id"),
      supabase.from("user_moderation").select("user_id,is_admin,banned"),
      supabase.rpc("admin_user_activity"),
    ]).then(([{ data: profiles }, { data: sailings }, { data: moderation }, { data: activity }]) => {
      if (cancelled) return;
      const sailingCounts = new Map<string, number>();
      for (const s of sailings ?? []) {
        sailingCounts.set(s.user_id, (sailingCounts.get(s.user_id) ?? 0) + 1);
      }
      const moderationByUser = new Map((moderation ?? []).map((m) => [m.user_id, m]));
      const activityByUser = new Map(
        ((activity ?? []) as ActivityRow[]).map((a) => [a.user_id, { count: a.message_count, count7d: a.message_count_7d }])
      );

      setUsers(
        (profiles ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          avatarTint: p.avatar_tint,
          country: p.country,
          sailingCount: sailingCounts.get(p.id) ?? 0,
          messageCount: activityByUser.get(p.id)?.count ?? 0,
          messageCount7d: activityByUser.get(p.id)?.count7d ?? 0,
          isAdmin: moderationByUser.get(p.id)?.is_admin ?? false,
          banned: moderationByUser.get(p.id)?.banned ?? false,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleBan(target: UserRow) {
    setPending(target.id);
    const supabase = createClient();
    await supabase
      .from("user_moderation")
      .upsert({ user_id: target.id, banned: !target.banned }, { onConflict: "user_id" });
    setUsers((prev) => prev?.map((u) => (u.id === target.id ? { ...u, banned: !u.banned } : u)) ?? null);
    setPending(null);
  }

  const sorted = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    const filtered = q ? users.filter((u) => u.name.toLowerCase().includes(q)) : users;
    const sortValue: Record<SortKey, (u: UserRow) => number> = {
      active7d: (u) => u.messageCount7d,
      sailings: (u) => u.sailingCount,
      messages: (u) => u.messageCount,
    };
    const value = sortValue[sortKey];
    return [...filtered].sort((a, b) => value(b) - value(a));
  }, [users, query, sortKey]);

  if (!sorted) return <div className="text-sm text-muted">Loading…</div>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users by name"
          placeholder="Search by name…"
          className="w-full max-w-[320px] rounded-[11px] border-[1.5px] border-border bg-input px-[13px] py-2.5 font-sans text-sm text-charcoal transition-colors focus:border-teal"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sort users by"
          className={selectInput + " w-auto"}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-hidden rounded-[16px] border border-[#e4f0f1] bg-white">
        {sorted.map((u, i) => (
          <div
            key={u.id}
            className={`flex items-center gap-3 px-4 py-3 ${i < sorted.length - 1 ? "border-b border-border" : ""}`}
          >
            <Avatar emoji={u.avatar} tint={u.avatarTint} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
                <span className="truncate">{u.name}</span>
                {u.isAdmin ? (
                  <span className="shrink-0 rounded-full bg-teal-tint px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.05em] text-teal uppercase">
                    Admin
                  </span>
                ) : null}
                {u.banned ? (
                  <span className="shrink-0 rounded-full bg-[#fff3eb] px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.05em] text-coral uppercase">
                    Banned
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-muted-2">
                {u.country || "No country set"} · {u.sailingCount} sailing{u.sailingCount === 1 ? "" : "s"} ·{" "}
                {u.messageCount} message{u.messageCount === 1 ? "" : "s"} · {u.messageCount7d} in last 7d
              </div>
            </div>
            {u.id === userId ? null : (
              <button
                type="button"
                onClick={() => toggleBan(u)}
                disabled={pending === u.id}
                className={`shrink-0 rounded-[9px] border-[1.5px] px-3 py-1.5 font-sans text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  u.banned
                    ? "border-border text-muted hover:border-teal hover:text-teal"
                    : "border-[#ffd0b8] text-coral hover:bg-[#fff3eb]"
                }`}
              >
                {u.banned ? "Unban" : "Ban"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
