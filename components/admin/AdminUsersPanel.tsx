"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

type UserRow = {
  id: string;
  name: string;
  avatar: string;
  country: string;
  sailingCount: number;
  isAdmin: boolean;
  banned: boolean;
};

export default function AdminUsersPanel() {
  const { userId } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("id,name,avatar,country"),
      supabase.from("joined_sailings").select("user_id"),
      supabase.from("user_moderation").select("user_id,is_admin,banned"),
    ]).then(([{ data: profiles }, { data: sailings }, { data: moderation }]) => {
      if (cancelled) return;
      const sailingCounts = new Map<string, number>();
      for (const s of sailings ?? []) {
        sailingCounts.set(s.user_id, (sailingCounts.get(s.user_id) ?? 0) + 1);
      }
      const moderationByUser = new Map((moderation ?? []).map((m) => [m.user_id, m]));

      setUsers(
        (profiles ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          country: p.country,
          sailingCount: sailingCounts.get(p.id) ?? 0,
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

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => u.name.toLowerCase().includes(q)) : users;
  }, [users, query]);

  if (!filtered) return <div className="text-sm text-muted">Loading…</div>;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        className="mb-3 w-full max-w-[320px] rounded-[11px] border-[1.5px] border-border bg-input px-[13px] py-2.5 font-sans text-sm text-charcoal transition-colors focus:border-teal"
      />
      <div className="overflow-hidden rounded-[16px] border border-[#e4f0f1] bg-white">
        {filtered.map((u, i) => (
          <div
            key={u.id}
            className={`flex items-center gap-3 px-4 py-3 ${i < filtered.length - 1 ? "border-b border-border" : ""}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f7f7] text-lg">
              {u.avatar}
            </span>
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
                {u.country || "No country set"} · {u.sailingCount} sailing{u.sailingCount === 1 ? "" : "s"}
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
