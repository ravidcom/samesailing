"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, type OnboardingProfile } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useTravelerCount } from "@/lib/useTravelerCount";
import { profileLabel } from "@/lib/partyLabels";
import { findOrCreateThread } from "@/lib/dmThreads";
import { GROUP_SEED_MESSAGES, formatTimeLabel, type ChatMessage } from "@/lib/chatData";

type GroupMessageRow = {
  id: string;
  sailing_id: string;
  user_id: string;
  sender_label: string;
  body: string;
  deleted: boolean;
  created_at: string;
};

type DmMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_label: string;
  body: string;
  deleted: boolean;
  created_at: string;
};

type DmThreadSummary = {
  id: string;
  otherUserId: string;
  label: string;
  avatar: string;
  preview: string;
  timeLabel: string;
  sortKey: number;
};

function rowToGroupMessage(row: GroupMessageRow, myUserId: string | null): ChatMessage {
  return {
    id: row.id,
    mine: row.user_id === myUserId,
    sender: row.user_id === myUserId ? "You" : row.sender_label,
    body: row.body,
    ts: formatTimeLabel(new Date(row.created_at)),
    deleted: row.deleted,
  };
}

function rowToDmMessage(row: DmMessageRow, myUserId: string | null): ChatMessage {
  return {
    id: row.id,
    mine: row.sender_id === myUserId,
    sender: row.sender_id === myUserId ? "You" : row.sender_label,
    body: row.body,
    ts: formatTimeLabel(new Date(row.created_at)),
    deleted: row.deleted,
  };
}

async function fetchDmThreads(
  supabase: SupabaseClient,
  sailingId: string,
  myId: string
): Promise<DmThreadSummary[]> {
  const { data: threads } = await supabase
    .from("dm_threads")
    .select("id,user_a,user_b")
    .eq("sailing_id", sailingId)
    .or(`user_a.eq.${myId},user_b.eq.${myId}`);
  if (!threads || threads.length === 0) return [];

  const otherIds = threads.map((t) => (t.user_a === myId ? t.user_b : t.user_a));
  const threadIds = threads.map((t) => t.id);

  const [{ data: profiles }, { data: lastMsgs }] = await Promise.all([
    supabase.from("joined_sailings").select("user_id,profile").eq("sailing_id", sailingId).in("user_id", otherIds),
    supabase
      .from("dm_messages")
      .select("thread_id,body,deleted,created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
  ]);

  const profileByUser = new Map<string, OnboardingProfile | null>(
    (profiles ?? []).map((p) => [p.user_id, p.profile as OnboardingProfile | null])
  );
  const lastByThread = new Map<string, { body: string; deleted: boolean; created_at: string }>();
  for (const m of lastMsgs ?? []) {
    if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);
  }

  return threads
    .map((t) => {
      const otherId = t.user_a === myId ? t.user_b : t.user_a;
      const profile = profileByUser.get(otherId) ?? null;
      const last = lastByThread.get(t.id);
      return {
        id: t.id,
        otherUserId: otherId,
        label: profileLabel(profile),
        avatar: profile?.avatar ?? "🙂",
        preview: last ? (last.deleted ? "Message removed" : last.body) : "Say hello!",
        timeLabel: last ? formatTimeLabel(new Date(last.created_at)) : "",
        sortKey: last ? new Date(last.created_at).getTime() : 0,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);
}

function itinName(itinerary: string) {
  return itinerary.split("·")[0].trim();
}

function shortDate(label: string) {
  const m = label.match(/^(\w+) (\d+)/);
  return m ? `${m[1].slice(0, 3)} ${m[2]}` : label;
}

function MessageBubble({
  msg,
  deletable,
  onDelete,
}: {
  msg: ChatMessage;
  deletable?: boolean;
  onDelete?: (id: string) => void;
}) {
  if (msg.deleted) {
    return (
      <div className={`max-w-[74%] ${msg.mine ? "self-end" : "self-start"}`}>
        <div
          className={`mb-1 text-[11px] font-semibold ${msg.mine ? "text-right text-muted-2" : "pl-0.5 text-teal"}`}
        >
          {msg.sender}
        </div>
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs italic text-muted-2">
          Message removed
        </div>
        <div className={`mt-1 text-[10px] text-muted-2 ${msg.mine ? "text-right" : "pl-0.5"}`}>{msg.ts}</div>
      </div>
    );
  }

  return (
    <div className={`group max-w-[74%] ${msg.mine ? "self-end" : "self-start"}`}>
      <div
        className={`mb-1 flex items-center gap-2 text-[11px] font-semibold ${msg.mine ? "justify-end pr-0.5 text-muted-2" : "pl-0.5 text-teal"}`}
      >
        {msg.mine && deletable && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(msg.id)}
            className="hidden text-[10px] font-normal text-muted-2 underline decoration-dotted group-hover:inline hover:text-coral"
          >
            Delete
          </button>
        ) : null}
        {msg.sender}
      </div>
      <div
        className={
          msg.mine
            ? "rounded-2xl rounded-br-[4px] bg-teal px-3.5 py-2.5 text-[13px] leading-relaxed text-white"
            : "rounded-2xl rounded-bl-[4px] border border-border bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-charcoal"
        }
      >
        {msg.body}
      </div>
      <div className={`mt-1 text-[10px] text-muted-2 ${msg.mine ? "text-right" : "pl-0.5"}`}>{msg.ts}</div>
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-1 flex items-center gap-2.5">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] text-muted-2">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function ChatApp() {
  return (
    <Suspense fallback={<main className="pt-[62px]" />}>
      <ChatAppInner />
    </Suspense>
  );
}

function ChatAppInner() {
  const { loading, loggedIn, mySailings, userId } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activeSailingId, setActiveSailingId] = useState(mySailings[0]?.id ?? null);
  const [pane, setPane] = useState<{ type: "group" } | { type: "dm"; id: string }>({ type: "group" });
  const [mobileShowingThread, setMobileShowingThread] = useState(false);

  const [realGroupMsgs, setRealGroupMsgs] = useState<ChatMessage[]>([]);
  const [groupDraft, setGroupDraft] = useState("");

  const [dmThreads, setDmThreads] = useState<DmThreadSummary[]>([]);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const [dmDraft, setDmDraft] = useState("");
  const deepLinkHandled = useRef<string | null>(null);

  const activeSailing = mySailings.find((s) => s.id === activeSailingId) ?? mySailings[0] ?? null;
  const groupMessages = useMemo(
    () => [...GROUP_SEED_MESSAGES, ...realGroupMsgs],
    [realGroupMsgs]
  );
  const realIds = useMemo(() => new Set(realGroupMsgs.map((m) => m.id)), [realGroupMsgs]);
  const activeDmThreadId = pane.type === "dm" ? pane.id : null;
  const activeThread = dmThreads.find((t) => t.id === activeDmThreadId) ?? null;
  const travelerCount = useTravelerCount(activeSailing?.id ?? null);

  // Group chat: load history + subscribe to realtime inserts/updates.
  useEffect(() => {
    if (!activeSailing) return;

    let cancelled = false;

    function upsert(row: GroupMessageRow) {
      const msg = rowToGroupMessage(row, userId);
      setRealGroupMsgs((prev) =>
        prev.some((m) => m.id === msg.id)
          ? prev.map((m) => (m.id === msg.id ? msg : m))
          : [...prev, msg]
      );
    }

    supabase
      .from("group_messages")
      .select("id,sailing_id,user_id,sender_label,body,deleted,created_at")
      .eq("sailing_id", activeSailing.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setRealGroupMsgs(data.map((row) => rowToGroupMessage(row, userId)));
      });

    const channel = supabase
      .channel(`group_messages:${activeSailing.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `sailing_id=eq.${activeSailing.id}`,
        },
        (payload) => upsert(payload.new as GroupMessageRow)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_messages",
          filter: `sailing_id=eq.${activeSailing.id}`,
        },
        (payload) => upsert(payload.new as GroupMessageRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeSailing, supabase, userId]);

  // Sidebar DM thread list for the active sailing.
  useEffect(() => {
    if (!activeSailing || !userId) return;
    let cancelled = false;
    fetchDmThreads(supabase, activeSailing.id, userId).then((list) => {
      if (!cancelled) setDmThreads(list);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSailing, userId, supabase]);

  // Deep link from a passenger card: /chat?with=<otherUserId>&sailing=<sailingId>
  // This is a one-shot action keyed by deepLinkHandled, not an ongoing subscription,
  // so it deliberately runs to completion even if a StrictMode dev double-invoke
  // unmounts the effect that kicked it off.
  useEffect(() => {
    const withId = searchParams.get("with");
    const sailingParam = searchParams.get("sailing");
    if (!withId || !sailingParam || !userId) return;
    const key = `${sailingParam}:${withId}`;
    if (deepLinkHandled.current === key) return;
    deepLinkHandled.current = key;

    (async () => {
      if (sailingParam !== activeSailingId) setActiveSailingId(sailingParam);
      const threadId = await findOrCreateThread(supabase, sailingParam, userId, withId);
      const list = await fetchDmThreads(supabase, sailingParam, userId);
      setDmThreads(list);
      setPane({ type: "dm", id: threadId });
      setMobileShowingThread(true);
      router.replace("/chat");
    })();
  }, [searchParams, userId, activeSailingId, supabase, router]);

  // Active DM thread: load history + subscribe to realtime inserts/updates.
  useEffect(() => {
    if (!activeDmThreadId) return;
    let cancelled = false;

    function upsert(row: DmMessageRow) {
      const msg = rowToDmMessage(row, userId);
      setDmMessages((prev) =>
        prev.some((m) => m.id === msg.id)
          ? prev.map((m) => (m.id === msg.id ? msg : m))
          : [...prev, msg]
      );
    }

    supabase
      .from("dm_messages")
      .select("id,thread_id,sender_id,sender_label,body,deleted,created_at")
      .eq("thread_id", activeDmThreadId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setDmMessages(data.map((row) => rowToDmMessage(row, userId)));
      });

    const channel = supabase
      .channel(`dm_messages:${activeDmThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${activeDmThreadId}`,
        },
        (payload) => upsert(payload.new as DmMessageRow)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${activeDmThreadId}`,
        },
        (payload) => upsert(payload.new as DmMessageRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeDmThreadId, supabase, userId]);

  function selectSailing(id: string) {
    setActiveSailingId(id);
    setPane({ type: "group" });
  }

  function openGroupPane() {
    setPane({ type: "group" });
    setMobileShowingThread(true);
  }

  function openDm(id: string) {
    setPane({ type: "dm", id });
    setMobileShowingThread(true);
  }

  function backToList() {
    setMobileShowingThread(false);
  }

  async function sendGroup() {
    const text = groupDraft.trim();
    if (!text || !activeSailing || !userId) return;
    setGroupDraft("");
    const senderLabel = profileLabel(activeSailing.profile);
    await supabase.from("group_messages").insert({
      sailing_id: activeSailing.id,
      user_id: userId,
      sender_label: senderLabel,
      body: text,
    });
  }

  async function deleteGroupMessage(id: string) {
    if (!userId) return;
    await supabase.from("group_messages").update({ deleted: true }).eq("id", id).eq("user_id", userId);
    setRealGroupMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, body: "" } : m)));
  }

  async function sendDm() {
    const text = dmDraft.trim();
    if (!text || !activeDmThreadId || !userId || !activeSailing) return;
    setDmDraft("");
    await supabase.from("dm_messages").insert({
      thread_id: activeDmThreadId,
      sender_id: userId,
      sender_label: profileLabel(activeSailing.profile),
      body: text,
    });
    fetchDmThreads(supabase, activeSailing.id, userId).then(setDmThreads);
  }

  async function deleteDmMessage(id: string) {
    if (!userId) return;
    await supabase.from("dm_messages").update({ deleted: true }).eq("id", id).eq("sender_id", userId);
    setDmMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, body: "" } : m)));
    if (activeSailing) {
      fetchDmThreads(supabase, activeSailing.id, userId).then(setDmThreads);
    }
  }

  if (loading) {
    return <main className="pt-[62px]" />;
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16 text-center">
        <div className="w-full max-w-[420px]">
          <h1 className="mb-3 font-display text-2xl font-bold text-charcoal">
            Sign in to see your messages
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted">
            Group chat and private messages are available once you&apos;ve
            joined a sailing.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-xl bg-teal px-6 py-3 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Sign in →
          </Link>
        </div>
      </main>
    );
  }

  if (!activeSailing) {
    return (
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16 text-center">
        <div className="w-full max-w-[420px]">
          <h1 className="mb-3 font-display text-2xl font-bold text-charcoal">
            Join a sailing to start chatting
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted">
            Once you&apos;re aboard, you&apos;ll get access to your sailing&apos;s
            group chat and can message fellow travelers privately.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-teal px-6 py-3 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Search for a sailing →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-62px)] overflow-hidden pt-[62px]">
      {/* SIDEBAR */}
      <div
        className={`w-full shrink-0 flex-col border-r border-border bg-white md:flex md:w-[312px] ${
          mobileShowingThread ? "hidden" : "flex"
        }`}
      >
        <div className="border-b border-border px-3.5 pb-2 pt-2.5">
          <div className="mb-0.5 font-display text-[13px] font-bold">Messages</div>
          <div className="text-[11px] text-muted-2">
            {mySailings.length > 1 ? "Pick a sailing to see its chats" : "Your sailing"}
          </div>
          {mySailings.length > 1 ? (
            <div className="mt-2.5 flex max-h-[170px] flex-col gap-2 overflow-y-auto">
              {mySailings.map((s) => {
                const active = s.id === activeSailing.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSailing(s.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-[14px] px-3 py-2.5 text-left font-sans transition-colors ${
                      active
                        ? "border-[1.5px] border-teal bg-teal text-white"
                        : "border-[1.5px] border-[#cfe6e8] bg-white text-[#3a5a5f]"
                    }`}
                  >
                    <span className="text-base">🚢</span>
                    <span className="leading-[1.15]">
                      <span className="block text-[12.5px] font-bold">{s.shipName}</span>
                      <span className={`text-[10.5px] ${active ? "opacity-85" : "text-[#8aa6aa]"}`}>
                        {shortDate(s.date)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="px-2.5 pb-1.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[.08em] text-muted-2">
            Group chat
          </div>
          <div
            onClick={openGroupPane}
            className="mx-0.5 mb-1.5 cursor-pointer rounded-2xl p-3.5 text-white shadow-[0_10px_22px_rgba(14,140,153,.3)]"
            style={{ background: "linear-gradient(135deg,#0E8C99,#0a6f7a)" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⛴️</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-bold">
                  {itinName(activeSailing.itinerary)}
                </div>
                <div className="mt-0.5 text-[11px] font-medium opacity-85">
                  Group chat · {travelerCount} travelers
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-[#b7c9cb]">
            Direct messages
          </div>
          {dmThreads.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-muted-2">
              Message a fellow traveler from the passenger board to start a conversation.
            </div>
          ) : null}
          {dmThreads.map((t) => (
            <div
              key={t.id}
              onClick={() => openDm(t.id)}
              className={`mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-[10px] p-2.5 transition-colors hover:bg-input ${
                pane.type === "dm" && pane.id === t.id ? "border-l-2 border-teal bg-input" : ""
              }`}
            >
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#f2f7f7] text-sm">
                {t.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-charcoal">{t.label}</span>
                  <span className="shrink-0 text-[11px] text-muted-2">{t.timeLabel}</span>
                </div>
                <div className="truncate text-xs text-[#5f8288]">{t.preview}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GROUP PANE */}
      {pane.type === "group" ? (
        <div className={`flex-1 flex-col overflow-hidden md:flex ${mobileShowingThread ? "flex" : "hidden"}`}>
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4.5 py-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={backToList}
                className="mr-1.5 flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border text-muted md:hidden"
                aria-label="Back to all chats"
              >
                ←
              </button>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-charcoal">
                  🚢 {itinName(activeSailing.itinerary)}
                </div>
                <div className="text-xs text-muted-2">
                  {travelerCount} travelers · {activeSailing.shipName}, {shortDate(activeSailing.date)}
                </div>
              </div>
            </div>
            <Link
              href={`/sailing/${activeSailing.id}/board`}
              className="shrink-0 rounded-[9px] border-[1.5px] border-border px-3 py-1.5 font-sans text-xs text-muted transition-colors hover:border-teal hover:text-teal"
            >
              View passengers
            </Link>
          </div>

          <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4.5 py-3.5">
            {groupMessages.map((m) => (
              <div key={m.id} className="flex flex-col gap-3.5">
                {m.day ? <DayDivider label={m.day} /> : null}
                <MessageBubble msg={m} deletable={realIds.has(m.id)} onDelete={deleteGroupMessage} />
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-border bg-white px-5.5 py-3.5">
            <div className="flex items-end gap-2.5">
              <textarea
                value={groupDraft}
                onChange={(e) => setGroupDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendGroup();
                  }
                }}
                placeholder="Message the group..."
                rows={1}
                className="max-h-[100px] min-h-[44px] flex-1 resize-none rounded-xl border-[1.5px] border-border bg-input px-3.5 py-2.5 font-sans text-[13px] text-charcoal transition-colors focus:border-teal"
              />
              <button
                type="button"
                onClick={sendGroup}
                className="shrink-0 rounded-[11px] bg-teal px-4.5 py-2.5 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
              >
                Send
              </button>
            </div>
            <div className="mt-1.5 text-center text-[11px] text-muted-2">
              Your partial profile is shown as your name
            </div>
          </div>
        </div>
      ) : null}

      {/* DM PANE */}
      {pane.type === "dm" ? (
        <div className={`flex-1 flex-col overflow-hidden md:flex ${mobileShowingThread ? "flex" : "hidden"}`}>
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4.5 py-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={backToList}
                className="mr-1.5 flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border text-muted md:hidden"
                aria-label="Back to all chats"
              >
                ←
              </button>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-charcoal">
                  {activeThread?.label ?? "Conversation"}
                </div>
                <div className="text-xs text-muted-2">
                  {activeSailing.shipName}, {shortDate(activeSailing.date)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={openGroupPane}
              className="shrink-0 rounded-[9px] border-[1.5px] border-border px-3 py-1.5 font-sans text-xs text-muted transition-colors hover:border-teal hover:text-teal"
            >
              ← Group chat
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4.5 py-3.5">
            <DayDivider label="Conversation history" />
            {dmMessages.map((m) => (
              <MessageBubble key={m.id} msg={m} deletable={m.mine} onDelete={deleteDmMessage} />
            ))}
          </div>

          <div className="shrink-0 border-t border-border bg-white px-5.5 py-3.5">
            <div className="flex items-end gap-2.5">
              <textarea
                value={dmDraft}
                onChange={(e) => setDmDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendDm();
                  }
                }}
                placeholder="Send a private message..."
                rows={1}
                className="max-h-[100px] min-h-[44px] flex-1 resize-none rounded-xl border-[1.5px] border-border bg-input px-3.5 py-2.5 font-sans text-[13px] text-charcoal transition-colors focus:border-teal"
              />
              <button
                type="button"
                onClick={sendDm}
                className="shrink-0 rounded-[11px] bg-teal px-4.5 py-2.5 font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
              >
                Send
              </button>
            </div>
            <div className="mt-1.5 text-center text-[11px] text-muted-2">
              Only you and this traveler can see these messages
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
