"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  kind: "group_message" | "dm_message";
  sailing_id: string | null;
  thread_id: string | null;
  sender_label: string;
  preview: string;
  created_at: string;
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationLog() {
  const { userId, mySailings } = useAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("notifications")
      .select("id,kind,sailing_id,thread_id,sender_label,preview,created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled && data) setRows(data);
      });

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setRows((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold text-charcoal">
        Notification log
      </h2>
      <div className="overflow-hidden rounded-[20px] border border-[#e4f0f1] bg-white">
        {rows.map((row, i) => {
          const shipName = row.sailing_id
            ? mySailings.find((s) => s.id === row.sailing_id)?.shipName
            : null;
          const title = row.kind === "group_message" ? "New group chat message" : "New private message";
          const detail = shipName
            ? `${row.sender_label} · ${shipName}: ${row.preview}`
            : `${row.sender_label}: ${row.preview}`;
          return (
            <div
              key={row.id}
              className={`flex items-start gap-3 px-5 py-4 ${
                i < rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="text-lg">{row.kind === "group_message" ? "💬" : "✉️"}</div>
              <div>
                <div className="mb-0.5 text-[13px] font-semibold text-charcoal">{title}</div>
                <div className="text-xs text-muted">{detail}</div>
                <div className="mt-1 text-[11px] text-muted-2">{relativeTime(row.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
