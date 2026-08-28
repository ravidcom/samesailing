"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

type ReportStatus = "open" | "resolved" | "dismissed";

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  sailing_id: string | null;
  message_kind: "group_message" | "dm_message" | null;
  message_preview: string | null;
  reason: string;
  note: string | null;
  status: ReportStatus;
  created_at: string;
};

type ContactRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

const STATUS_STYLE: Record<ReportStatus, string> = {
  open: "bg-[#fff3eb] text-coral",
  resolved: "bg-teal-tint text-teal",
  dismissed: "bg-[#f2f7f7] text-muted-2",
};

export default function AdminReportsPanel() {
  const { userId } = useAuth();
  const [reports, setReports] = useState<ReportRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [banned, setBanned] = useState<Record<string, boolean>>({});
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
    ]).then(async ([{ data: reportRows }, { data: contactRows }]) => {
      if (cancelled) return;
      setReports((reportRows as ReportRow[]) ?? []);
      setContacts(contactRows ?? []);

      const userIds = new Set<string>();
      for (const r of reportRows ?? []) {
        userIds.add(r.reporter_id);
        userIds.add(r.reported_user_id);
      }
      if (userIds.size > 0) {
        const [{ data: profiles }, { data: moderation }] = await Promise.all([
          supabase.from("profiles").select("id,name").in("id", [...userIds]),
          supabase.from("user_moderation").select("user_id,banned").in("user_id", [...userIds]),
        ]);
        if (cancelled) return;
        setNames(Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name])));
        setBanned(Object.fromEntries((moderation ?? []).map((m) => [m.user_id, m.banned])));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(id: string, status: ReportStatus) {
    setPending(id);
    const supabase = createClient();
    await supabase.from("reports").update({ status }).eq("id", id);
    setReports((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null);
    setPending(null);
  }

  // Bans by exact user id, taken straight from the report row - no risk of
  // matching the wrong person even when several travelers share a name.
  async function toggleBan(targetUserId: string) {
    setPending(targetUserId);
    const supabase = createClient();
    const nextBanned = !banned[targetUserId];
    await supabase.from("user_moderation").upsert({ user_id: targetUserId, banned: nextBanned }, { onConflict: "user_id" });
    setBanned((prev) => ({ ...prev, [targetUserId]: nextBanned }));
    setPending(null);
  }

  const visibleReports = useMemo(() => {
    if (!reports) return null;
    return showAll ? reports : reports.filter((r) => r.status === "open");
  }, [reports, showAll]);

  if (!visibleReports || !contacts) return <div className="text-sm text-muted">Loading…</div>;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className={`rounded-full border-[1.5px] px-3.5 py-1.5 font-sans text-[13px] font-semibold ${
            !showAll ? "border-teal bg-teal text-white" : "border-border bg-white text-muted"
          }`}
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={`rounded-full border-[1.5px] px-3.5 py-1.5 font-sans text-[13px] font-semibold ${
            showAll ? "border-teal bg-teal text-white" : "border-border bg-white text-muted"
          }`}
        >
          All
        </button>
      </div>

      {visibleReports.length === 0 ? (
        <div className="rounded-[16px] border-[1.5px] border-dashed border-border bg-input px-6 py-8 text-center text-sm text-muted">
          Nothing here.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visibleReports.map((r) => (
            <div key={r.id} className="rounded-[14px] border border-[#e4f0f1] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-charcoal">
                  {names[r.reporter_id] ?? r.reporter_id} reported {names[r.reported_user_id] ?? r.reported_user_id}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-[.03em] uppercase ${STATUS_STYLE[r.status]}`}
                >
                  {r.status}
                </span>
              </div>
              <div className="mt-1.5 text-[13px] text-muted">
                <strong className="font-semibold text-charcoal">{r.reason}</strong>
                {r.note ? ` — ${r.note}` : ""}
              </div>
              {r.message_preview ? (
                <div className="mt-2 rounded-[10px] bg-input px-3 py-2 text-xs text-muted">
                  {r.message_kind === "dm_message" ? "DM" : "Group"}: “{r.message_preview}”
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-2">
                <span>
                  {r.sailing_id ? `${r.sailing_id} · ` : ""}
                  {new Date(r.created_at).toLocaleString()}
                </span>
                {r.sailing_id && r.message_kind === "group_message" ? (
                  <Link href={`/chat?sailing=${r.sailing_id}`} className="font-semibold text-teal hover:underline">
                    Open group chat →
                  </Link>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status === "open" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, "resolved")}
                      disabled={pending === r.id}
                      className="rounded-[9px] border-[1.5px] border-teal px-3 py-1.5 font-sans text-xs font-semibold text-teal transition-colors hover:bg-teal-tint disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, "dismissed")}
                      disabled={pending === r.id}
                      className="rounded-[9px] border-[1.5px] border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted transition-colors hover:border-muted-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Dismiss
                    </button>
                  </>
                ) : null}
                {r.reported_user_id === userId ? null : (
                  <button
                    type="button"
                    onClick={() => toggleBan(r.reported_user_id)}
                    disabled={pending === r.reported_user_id}
                    className={`rounded-[9px] border-[1.5px] px-3 py-1.5 font-sans text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      banned[r.reported_user_id]
                        ? "border-border text-muted hover:border-teal hover:text-teal"
                        : "border-[#ffd0b8] text-coral hover:bg-[#fff3eb]"
                    }`}
                  >
                    {banned[r.reported_user_id] ? "Unban" : "Ban"} {names[r.reported_user_id] ?? "user"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 mb-3 font-display text-lg font-bold text-charcoal">Contact messages</div>
      {contacts.length === 0 ? (
        <div className="rounded-[16px] border-[1.5px] border-dashed border-border bg-input px-6 py-8 text-center text-sm text-muted">
          Nothing here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-[#e4f0f1] bg-white">
          {contacts.map((c, i) => (
            <div key={c.id} className={`px-4 py-3 ${i < contacts.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-semibold text-charcoal">
                  {c.name} <span className="font-normal text-muted-2">· {c.email}</span>
                </div>
                <div className="text-[11px] text-muted-2">{new Date(c.created_at).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-[13px] text-muted">{c.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
