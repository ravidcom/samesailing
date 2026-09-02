"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, type OnboardingProfile, type PartyType } from "@/lib/auth-context";
import { PARTY_ICON, PARTY_LABELS } from "@/lib/partyLabels";
import { GOALS } from "@/lib/goals";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useTravelerCount } from "@/lib/useTravelerCount";
import { resolveDisplayName, type NameFields } from "@/lib/displayName";
import { findOrCreateThread } from "@/lib/dmThreads";
import { GROUP_SEED_MESSAGES, formatTimeLabel, chatListTimeLabel, type ChatMessage } from "@/lib/chatData";
import { sailingDateKey, shortSailingLabels } from "@/lib/sailingLabel";
import { badgeForRank } from "@/lib/pioneer";
import { CompactBadge } from "@/components/ui/PioneerBadge";
import InstallAppButton from "@/components/ui/InstallAppButton";
import ReportModal, { type ReportTarget } from "@/components/ui/ReportModal";
import Avatar from "@/components/ui/Avatar";
import PrideStripe from "@/components/ui/PrideStripe";
import { sanitizeAvatar, DEFAULT_AVATAR_EMOJI, DEFAULT_AVATAR_TINT } from "@/lib/avatars";
import { registerChatThreadCloser } from "@/lib/chatThreadBridge";

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
  anon: boolean;
  joinRank: number | null;
  avatarEmoji: string;
  avatarTint: string;
  preview: string;
  timeLabel: string;
  sortKey: number;
  lastMessageAtMs: number;
  lastMessageMine: boolean;
  /** Epoch ms of every message the other person sent in this thread - lets
   * the unread badge count messages instead of just flagging "something's
   * new", reactively against readMap (no refetch needed when it changes). */
  otherMessageTimestamps: number[];
};

type MemberInfo = {
  joinRank: number | null;
  avatarEmoji: string;
  avatarTint: string;
  lgbtq: boolean;
  partyType: PartyType;
  ageLabel: string;
  country?: string;
  goals: string[];
};

/** A run of consecutive messages from one sender: avatar and name print
 * once at the top, timestamp once at the bottom. Breaks on a sender
 * change or a 5+ minute gap - never merges across a day divider, since a
 * new day always means a large gap in practice anyway. */
const RUN_GAP_MS = 5 * 60 * 1000;
type MessageRun = {
  key: string;
  mine: boolean;
  senderId: string | null;
  senderName: string;
  day?: string;
  items: ChatMessage[];
};
function buildMessageRuns(messages: ChatMessage[]): MessageRun[] {
  const runs: MessageRun[] = [];
  let lastSenderKey: string | null = null;
  let lastAtMs: number | null = null;
  for (const m of messages) {
    const senderKey = m.mine ? "__mine__" : (m.userId ?? m.sender);
    const gapTooLarge = lastAtMs == null || m.atMs == null || m.atMs - lastAtMs >= RUN_GAP_MS;
    const sameSender = !m.day && lastSenderKey === senderKey && !gapTooLarge;
    const current = runs[runs.length - 1];
    if (sameSender && current) {
      current.items.push(m);
    } else {
      runs.push({ key: m.id, mine: m.mine, senderId: m.userId ?? null, senderName: m.sender, day: m.day, items: [m] });
    }
    lastSenderKey = senderKey;
    lastAtMs = m.atMs ?? null;
  }
  return runs;
}

/** The group card's second line, checked in order - each state is true of
 * a different sailing on the same day, and one sailing walks down the
 * ladder over its life. State 4 is the launch default, not an edge case:
 * most sailings are months out with nobody messaging yet. */
function groupStatusLine(
  unreadCount: number,
  lastMessage: { senderName: string; atMs: number } | null,
  joinsThisWeek: number
): string {
  if (unreadCount > 0) return `${unreadCount} new since you last looked`;
  if (lastMessage) return `${lastMessage.senderName} wrote ${relativeTimeLabel(lastMessage.atMs)}`;
  if (joinsThisWeek > 0) return `${joinsThisWeek} traveler${joinsThisWeek === 1 ? "" : "s"} joined this week`;
  return "Be the first to say hello";
}
function relativeTimeLabel(atMs: number): string {
  const diff = Date.now() - atMs;
  if (diff < 3600000) return "just now";
  if (diff < 86400000) return `${Math.max(1, Math.round(diff / 3600000))}h ago`;
  const days = Math.round(diff / 86400000);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function rowToGroupMessage(row: GroupMessageRow, myUserId: string | null): ChatMessage {
  return {
    id: row.id,
    mine: row.user_id === myUserId,
    sender: row.user_id === myUserId ? "You" : row.sender_label,
    body: row.body,
    ts: formatTimeLabel(new Date(row.created_at)),
    deleted: row.deleted,
    atMs: new Date(row.created_at).getTime(),
    userId: row.user_id,
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
    atMs: new Date(row.created_at).getTime(),
    userId: row.sender_id,
  };
}

/** Per-conversation "last read" timestamps, keyed by "group:<sailingId>" / "dm:<threadId>". */
function readMapKey(userId: string) {
  return `samesailing:chatRead:${userId}`;
}

function loadReadMap(userId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(readMapKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveReadMap(userId: string, map: Record<string, number>) {
  localStorage.setItem(readMapKey(userId), JSON.stringify(map));
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

  const [{ data: profiles }, { data: nameRows }, { data: lastMsgs }] = await Promise.all([
    supabase
      .from("joined_sailings")
      .select("user_id,profile,join_rank")
      .eq("sailing_id", sailingId)
      .in("user_id", otherIds),
    supabase.from("profiles").select("id,name,name_mode,nickname,avatar,avatar_tint").in("id", otherIds),
    supabase
      .from("dm_messages")
      .select("thread_id,sender_id,body,deleted,created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
  ]);

  const profileByUser = new Map<string, OnboardingProfile | null>(
    (profiles ?? []).map((p) => [p.user_id, p.profile as OnboardingProfile | null])
  );
  const joinRankByUser = new Map<string, number | null>((profiles ?? []).map((p) => [p.user_id, p.join_rank]));
  const nameFieldsByUser = new Map(
    (nameRows ?? []).map((r) => [
      r.id,
      { nameMode: r.name_mode, nickname: r.nickname, name: r.name } as NameFields,
    ])
  );
  // Avatar is account-level (My profile), not the per-sailing profile's
  // party-derived one - same profiles row as the name fields above.
  const avatarByUser = new Map((nameRows ?? []).map((r) => [r.id, sanitizeAvatar(r.avatar, r.avatar_tint)]));
  const lastByThread = new Map<string, { sender_id: string; body: string; deleted: boolean; created_at: string }>();
  const otherTimestampsByThread = new Map<string, number[]>();
  for (const m of lastMsgs ?? []) {
    if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);
    if (m.sender_id !== myId) {
      const arr = otherTimestampsByThread.get(m.thread_id) ?? [];
      arr.push(new Date(m.created_at).getTime());
      otherTimestampsByThread.set(m.thread_id, arr);
    }
  }

  return threads
    .map((t) => {
      const otherId = t.user_a === myId ? t.user_b : t.user_a;
      const profile = profileByUser.get(otherId) ?? null;
      const last = lastByThread.get(t.id);
      const resolved = resolveDisplayName(otherId, profile?.partyType ?? "solo", nameFieldsByUser.get(otherId));
      return {
        id: t.id,
        otherUserId: otherId,
        label: resolved.name,
        anon: resolved.anon,
        joinRank: joinRankByUser.get(otherId) ?? null,
        avatarEmoji: avatarByUser.get(otherId)?.emoji ?? DEFAULT_AVATAR_EMOJI,
        avatarTint: avatarByUser.get(otherId)?.tint ?? DEFAULT_AVATAR_TINT,
        preview: last ? (last.deleted ? "Message removed" : last.body) : "Say hello!",
        timeLabel: last ? chatListTimeLabel(new Date(last.created_at).getTime()) : "",
        sortKey: last ? new Date(last.created_at).getTime() : 0,
        lastMessageAtMs: last ? new Date(last.created_at).getTime() : 0,
        lastMessageMine: last ? last.sender_id === myId : false,
        otherMessageTimestamps: otherTimestampsByThread.get(t.id) ?? [],
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);
}

/** Aggregate unread count for a sailing's chat chip: unread group messages
 * (exact count) plus how many DM threads have an unread reply (a count of
 * threads, not of individual messages - the app only tracks one "last
 * read" timestamp per thread, not per-message read state). */
async function fetchSailingUnreadCount(
  supabase: SupabaseClient,
  sailingId: string,
  myId: string,
  readMap: Record<string, number>
): Promise<number> {
  const groupReadAt = readMap[`group:${sailingId}`] ?? 0;
  const [{ count: groupUnread }, dmThreads] = await Promise.all([
    supabase
      .from("group_messages")
      .select("id", { count: "exact", head: true })
      .eq("sailing_id", sailingId)
      .neq("user_id", myId)
      .gt("created_at", new Date(groupReadAt).toISOString()),
    fetchDmThreads(supabase, sailingId, myId),
  ]);
  const dmUnreadThreads = dmThreads.filter(
    (t) => !t.lastMessageMine && t.lastMessageAtMs > (readMap[`dm:${t.id}`] ?? 0)
  ).length;
  return (groupUnread ?? 0) + dmUnreadThreads;
}

/** Which sailing's chat the user was last looking at - persisted per user
 * (not reset each visit), separate from the per-conversation readMap. */
function activeSailingPrefKey(userId: string) {
  return `samesailing:activeChatSailing:${userId}`;
}
function loadActiveSailingPref(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(activeSailingPrefKey(userId));
}
function saveActiveSailingPref(userId: string, sailingId: string) {
  localStorage.setItem(activeSailingPrefKey(userId), sailingId);
}

/** An unsent DM draft, so a thread you started but haven't sent anything in
 * yet still shows what you were about to say in the chat list. */
function dmDraftKey(userId: string, threadId: string) {
  return `samesailing:dmDraft:${userId}:${threadId}`;
}
function loadDmDraft(userId: string, threadId: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(dmDraftKey(userId, threadId)) ?? "";
}
function saveDmDraft(userId: string, threadId: string, text: string) {
  if (text) localStorage.setItem(dmDraftKey(userId, threadId), text);
  else localStorage.removeItem(dmDraftKey(userId, threadId));
}

/** First/only bubble in a run keeps today's existing single-message corner
 * (the common case, unchanged); a run of 2+ gets a small tail only on the
 * first and last bubble, uniform corners in between. */
function bubbleRadiusClass(mine: boolean, position: "only" | "first" | "middle" | "last"): string {
  if (position === "middle") return "rounded-2xl";
  if (position === "last") return mine ? "rounded-2xl rounded-tr-[4px]" : "rounded-2xl rounded-tl-[4px]";
  return mine ? "rounded-2xl rounded-br-[4px]" : "rounded-2xl rounded-bl-[4px]";
}

function MessageActionsMenu({
  msg,
  deletable,
  isAdmin,
  onDelete,
  onReport,
}: {
  msg: ChatMessage;
  /** False for seed/demo content that isn't a real DB row - never offer to delete it. */
  deletable?: boolean;
  isAdmin?: boolean;
  onDelete?: (id: string, mine: boolean) => void;
  onReport?: (msg: ChatMessage) => void;
}) {
  const [open, setOpen] = useState(false);
  const canDelete = deletable && (msg.mine || isAdmin) && onDelete;
  const canReport = !msg.mine && msg.userId && onReport;
  if (!canDelete && !canReport) return null;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Message options"
        className="flex h-6 w-6 items-center justify-center rounded-full text-[15px] leading-none text-[#9fb9bc] transition-colors hover:bg-[#e9f6f7] hover:text-teal"
      >
        ⋯
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-20 mt-1 min-w-[150px] rounded-xl border border-[#e4f0f1] bg-white p-1.5 shadow-[0_12px_32px_rgba(42,32,28,.16)] ${
              msg.mine ? "right-0" : "left-0"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(msg.body).catch(() => {});
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left font-sans text-[13px] text-charcoal hover:bg-input"
            >
              Copy text
            </button>
            {canReport ? (
              <button
                type="button"
                onClick={() => {
                  onReport(msg);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left font-sans text-[13px] text-coral hover:bg-[#fff3eb]"
              >
                Report message
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(msg.id, msg.mine);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left font-sans text-[13px] text-coral hover:bg-[#fff3eb]"
              >
                Delete
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MessageRunBubble({
  msg,
  position,
  deletable,
  isAdmin,
  onDelete,
  onReport,
}: {
  msg: ChatMessage;
  position: "only" | "first" | "middle" | "last";
  deletable?: boolean;
  isAdmin?: boolean;
  onDelete?: (id: string, mine: boolean) => void;
  onReport?: (msg: ChatMessage) => void;
}) {
  const showTs = position === "only" || position === "last";
  if (msg.deleted) {
    return (
      <div className="mb-0.5">
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs italic text-muted-2">
          Message removed
        </div>
        {showTs ? <div className={`mt-1 text-[10px] text-muted-2 ${msg.mine ? "text-right" : "pl-0.5"}`}>{msg.ts}</div> : null}
      </div>
    );
  }
  return (
    <div className="mb-0.5">
      <div className={`flex items-center gap-1.5 ${msg.mine ? "flex-row-reverse" : ""}`}>
        <div
          className={
            msg.mine
              ? `${bubbleRadiusClass(true, position)} bg-teal px-3.5 py-2.5 text-[13px] leading-relaxed text-white`
              : `${bubbleRadiusClass(false, position)} border border-border bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-charcoal`
          }
        >
          {msg.body}
        </div>
        <MessageActionsMenu msg={msg} deletable={deletable} isAdmin={isAdmin} onDelete={onDelete} onReport={onReport} />
      </div>
      {showTs ? <div className={`mt-1 text-[10px] text-muted-2 ${msg.mine ? "text-right" : "pl-0.5"}`}>{msg.ts}</div> : null}
    </div>
  );
}

/** A run of consecutive same-sender messages: avatar + name print once,
 * per §3.1-3.3 - the avatar is also a tap target (§3.2), and the sender
 * line carries at most one badge (founding crew, else a pride bar), never
 * both (§3.3). */
function MessageRunView({
  run,
  memberInfo,
  isDeletable,
  isAdmin,
  onDelete,
  onReport,
  onSenderClick,
}: {
  run: MessageRun;
  memberInfo: Record<string, MemberInfo>;
  isDeletable: (msg: ChatMessage) => boolean;
  isAdmin?: boolean;
  onDelete?: (id: string, mine: boolean) => void;
  onReport?: (msg: ChatMessage) => void;
  /** Opens the profile peek card (§5) - passed the click event so the card
   * can position itself near the tap. */
  onSenderClick?: (senderId: string, senderName: string, event: React.MouseEvent) => void;
}) {
  const info = run.senderId ? memberInfo[run.senderId] : undefined;
  const badge = run.senderId ? badgeForRank(info?.joinRank) : null;
  const showPride = !run.mine && !badge && info?.lgbtq;
  const canOpenSender = !run.mine && !!run.senderId && !!onSenderClick;

  return (
    <div className={`flex max-w-[74%] items-end gap-2 ${run.mine ? "flex-row-reverse self-end" : "self-start"}`}>
      {!run.mine ? (
        canOpenSender ? (
          <button
            type="button"
            onClick={(e) => onSenderClick!(run.senderId!, run.senderName, e)}
            aria-label={`View ${run.senderName}'s profile`}
            className="mb-[3px] shrink-0"
          >
            <Avatar emoji={info?.avatarEmoji} tint={info?.avatarTint} size={32} />
          </button>
        ) : (
          <div className="mb-[3px] shrink-0">
            <Avatar emoji={info?.avatarEmoji} tint={info?.avatarTint} size={32} />
          </div>
        )
      ) : null}
      <div className="flex min-w-0 flex-col">
        {!run.mine ? (
          <div className="mb-1 flex items-center gap-1.5 pl-0.5">
            {canOpenSender ? (
              <button
                type="button"
                onClick={(e) => onSenderClick!(run.senderId!, run.senderName, e)}
                className="text-[11px] font-semibold text-teal hover:underline"
              >
                {run.senderName}
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-teal">{run.senderName}</span>
            )}
            {badge ? <CompactBadge badge={badge} /> : null}
            {showPride ? <PrideStripe className="h-[11px] w-[17px]" outlined /> : null}
          </div>
        ) : null}
        {run.items.map((m, i) => (
          <MessageRunBubble
            key={m.id}
            msg={m}
            position={run.items.length === 1 ? "only" : i === 0 ? "first" : i === run.items.length - 1 ? "last" : "middle"}
            deletable={isDeletable(m)}
            isAdmin={isAdmin}
            onDelete={onDelete}
            onReport={onReport}
          />
        ))}
      </div>
    </div>
  );
}

type ProfilePeekState = { senderId: string; senderName: string; x: number; y: number };

/** Tapping a sender's name or avatar opens this instead of jumping straight
 * into a DM - a quick look at who they are, with sending a private message
 * as an explicit next step rather than the only outcome of the tap. */
function ProfilePeekCard({
  peek,
  info,
  isBlocked,
  onClose,
  onMessage,
  onToggleBlock,
}: {
  peek: ProfilePeekState;
  info: MemberInfo | undefined;
  isBlocked: boolean;
  onClose: () => void;
  onMessage: () => void;
  onToggleBlock: () => void;
}) {
  const badge = badgeForRank(info?.joinRank);
  const showPride = !badge && info?.lgbtq;
  const bits = [info ? `${PARTY_ICON[info.partyType]} ${PARTY_LABELS[info.partyType]}` : null, info?.ageLabel, info?.country].filter(
    Boolean
  );
  const width = 272;
  const left = Math.min(Math.max(8, peek.x - width / 2), (typeof window !== "undefined" ? window.innerWidth : width + 16) - width - 8);
  const top = Math.min(peek.y + 10, (typeof window !== "undefined" ? window.innerHeight : peek.y + 300) - 260);

  return (
    <>
      <div className="fixed inset-0 z-[290]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={`${peek.senderName}'s profile`}
        style={{ left, top: Math.max(8, top), width }}
        className="fixed z-[300] rounded-2xl border border-border bg-white p-4 shadow-[0_12px_40px_rgba(42,32,28,.18)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full text-base text-muted-2 transition-colors hover:bg-input hover:text-charcoal"
        >
          ×
        </button>
        <div className="flex items-center gap-3 pr-6">
          <Avatar emoji={info?.avatarEmoji} tint={info?.avatarTint} size={50} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-bold text-charcoal">{peek.senderName}</span>
              {showPride ? <PrideStripe className="h-[11px] w-[17px]" outlined /> : null}
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-2">{bits.length ? bits.join(" · ") : "On this sailing"}</div>
          </div>
        </div>
        {badge ? (
          <div className="mt-2.5">
            <CompactBadge badge={badge} />
          </div>
        ) : null}
        {info?.goals && info.goals.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {info.goals.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full bg-teal-tint px-2.5 py-1 text-[11px] font-medium text-teal">
                {g}
              </span>
            ))}
          </div>
        ) : null}
        {isBlocked ? (
          <button
            type="button"
            onClick={onToggleBlock}
            className="mt-3.5 w-full rounded-[10px] border-[1.5px] border-border py-2.5 text-center font-sans text-[13px] font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
          >
            Unblock {peek.senderName}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onMessage}
              className="mt-3.5 w-full rounded-[10px] bg-teal py-2.5 text-center font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
            >
              ✉ Send private message
            </button>
            <button
              type="button"
              onClick={onToggleBlock}
              className="mt-2 w-full text-center font-sans text-[11.5px] text-muted-2 hover:text-coral"
            >
              🚫 Block {peek.senderName}
            </button>
          </>
        )}
      </div>
    </>
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

/** Shown once ever per user, per chat kind - dismissing it is permanent,
 * same "seen it, don't nag again" model as the other localStorage flags
 * in this file. */
function safetyNoticeSeenKey(userId: string, kind: "group" | "dm") {
  return `samesailing:safetyNoticeSeen:${kind}:${userId}`;
}
function loadSafetyNoticeSeen(userId: string, kind: "group" | "dm"): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(safetyNoticeSeenKey(userId, kind)) === "1";
}
function saveSafetyNoticeSeen(userId: string, kind: "group" | "dm") {
  localStorage.setItem(safetyNoticeSeenKey(userId, kind), "1");
}

function SafetyNotice({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-[#ffd9c9] bg-[#fff3eb] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#8a5a3a]">
      <span className="shrink-0">🛡️</span>
      <p className="flex-1">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-[#c99a7a] transition-colors hover:text-[#8a5a3a]"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Keeps a message list pinned to the newest message: jumps to the bottom
 * whenever the conversation changes (resetKey) or a new message arrives
 * while already near the bottom, and otherwise surfaces a "new message"
 * pill instead of yanking the scroll position out from under someone
 * reading older messages.
 *
 * The pill's visibility is toggled directly via its own ref (a style
 * flip, not React state) rather than round-tripping through a setState
 * call inside the effect — this is a DOM-measurement-driven sync (can't
 * know scroll position without the DOM), which is exactly what refs +
 * effects are for, but any setState written directly in an effect body
 * trips react-hooks/set-state-in-effect regardless of how it's wrapped.
 *
 * Takes both refs rather than creating and returning them — a hook
 * returning an object that bundles a ref together with state/other
 * values trips the react-hooks/refs lint rule.
 */
function useAutoScroll(
  containerRef: React.RefObject<HTMLDivElement | null>,
  pillRef: React.RefObject<HTMLButtonElement | null>,
  itemCount: number,
  resetKey: string | number | null
) {
  const prevLengthRef = useRef<number | null>(null);
  const prevResetKeyRef = useRef(resetKey);
  // scrollHeight as of the last check — scrollTop doesn't move on its own
  // when content is appended below the fold, but scrollHeight grows, so
  // comparing against the *current* (already-grown) scrollHeight would make
  // someone who was genuinely at the bottom look far from it the moment a
  // message tall enough to matter arrives. Comparing against what the
  // height was *before* this batch landed gives the right answer.
  const prevScrollHeightRef = useRef(0);

  function showPill(show: boolean) {
    const el = pillRef.current;
    if (el) el.style.display = show ? "flex" : "none";
  }

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    showPill(false);
  }

  useLayoutEffect(() => {
    const el = containerRef.current;

    if (resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      prevLengthRef.current = null;
    }

    if (prevLengthRef.current === null) {
      // Switched conversation (or first mount). Messages for a thread load
      // via a separate async fetch, so itemCount can still be 0 (or a
      // stale seed list) for a render or two after resetKey changes — keep
      // jumping to the bottom on every render until real data has actually
      // shown up, rather than treating that later arrival as "a new
      // message while scrolled away" and popping the pill.
      scrollToBottom();
      if (itemCount > 0) prevLengthRef.current = itemCount;
      prevScrollHeightRef.current = el?.scrollHeight ?? 0;
      return;
    }

    if (itemCount > prevLengthRef.current && el) {
      const wasNearBottom = prevScrollHeightRef.current - el.scrollTop - el.clientHeight < 80;
      if (wasNearBottom) {
        scrollToBottom();
      } else {
        showPill(true);
      }
    }
    prevLengthRef.current = itemCount;
    prevScrollHeightRef.current = el?.scrollHeight ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, resetKey]);

  return { scrollToBottom };
}

export default function ChatApp() {
  return (
    <Suspense fallback={<main className="pt-[62px]" />}>
      <ChatAppInner />
    </Suspense>
  );
}

function ChatAppInner() {
  const { loading, loggedIn, mySailings, userId, isAdmin, markChatSeen, myDisplayName } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activeSailingId, setActiveSailingIdState] = useState<string | null>(null);
  const [sailingSelectionInitialized, setSailingSelectionInitialized] = useState(false);
  const [sailingUnread, setSailingUnread] = useState<Record<string, number> | null>(null);
  const chipRowRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);

  const setActiveSailingId = useCallback(
    (id: string) => {
      setActiveSailingIdState(id);
      if (userId) saveActiveSailingPref(userId, id);
    },
    [userId]
  );

  const [pane, setPane] = useState<{ type: "group" } | { type: "dm"; id: string }>({ type: "group" });
  const [mobileShowingThread, setMobileShowingThread] = useState(false);

  const [realGroupMsgs, setRealGroupMsgs] = useState<ChatMessage[]>([]);
  const [groupDraft, setGroupDraft] = useState("");
  // Pioneer badge rank, avatar, and LGBTQ+ status per member of the active
  // sailing, for the group thread's sender line (§3.3: one badge slot -
  // founding crew, else a pride bar, never both) and gutter avatar (§3.2).
  const [memberInfo, setMemberInfo] = useState<Record<string, MemberInfo>>({});
  // For the group card's second-line ladder's state 3 (§8d) - travelers
  // who joined this sailing in the last 7 days.
  const [joinsThisWeek, setJoinsThisWeek] = useState(0);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [profilePeek, setProfilePeek] = useState<ProfilePeekState | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const [dmThreads, setDmThreads] = useState<DmThreadSummary[]>([]);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const [dmDraft, setDmDraft] = useState("");
  const deepLinkHandled = useRef<string | null>(null);
  const groupDeepLinkHandled = useRef<string | null>(null);
  const [readMap, setReadMap] = useState<Record<string, number>>({});

  const activeSailing = mySailings.find((s) => s.id === activeSailingId) ?? mySailings[0] ?? null;
  const orderedSailings = useMemo(
    () => [...mySailings].sort((a, b) => sailingDateKey(a.id).localeCompare(sailingDateKey(b.id))),
    [mySailings]
  );
  const shortLabels = useMemo(() => shortSailingLabels(orderedSailings), [orderedSailings]);
  const groupMessages = useMemo(
    () => [...GROUP_SEED_MESSAGES, ...realGroupMsgs],
    [realGroupMsgs]
  );
  const realIds = useMemo(() => new Set(realGroupMsgs.map((m) => m.id)), [realGroupMsgs]);
  const groupRuns = useMemo(() => buildMessageRuns(groupMessages), [groupMessages]);
  const dmRuns = useMemo(() => buildMessageRuns(dmMessages), [dmMessages]);
  const activeDmThreadId = pane.type === "dm" ? pane.id : null;
  const activeThread = dmThreads.find((t) => t.id === activeDmThreadId) ?? null;
  const travelerCount = useTravelerCount(activeSailing?.id ?? null);
  const groupSenderName = myDisplayName(activeSailing?.profile?.partyType ?? null).name;

  const groupContainerRef = useRef<HTMLDivElement>(null);
  const dmContainerRef = useRef<HTMLDivElement>(null);
  const groupPillRef = useRef<HTMLButtonElement>(null);
  const dmPillRef = useRef<HTMLButtonElement>(null);
  // The pane's own container div unmounts/remounts each time you switch
  // away and back (conditional {pane.type === "group" ? ... : null}
  // rendering), so a fresh (scrollTop-0) node needs a fresh jump-to-bottom
  // even though the sailing itself hasn't changed — folding pane.type into
  // the resetKey makes every "switched to this pane" transition register as
  // a reset, not just a genuine sailing change. The DM pane doesn't need
  // the same treatment: activeDmThreadId is already null whenever the DM
  // pane isn't showing, so switching to it already changes the resetKey.
  const groupScroll = useAutoScroll(
    groupContainerRef,
    groupPillRef,
    groupMessages.length,
    pane.type === "group" ? (activeSailing?.id ?? null) : null
  );
  const dmScroll = useAutoScroll(dmContainerRef, dmPillRef, dmMessages.length, activeDmThreadId);

  const groupReadAt = activeSailing ? (readMap[`group:${activeSailing.id}`] ?? 0) : 0;
  const groupUnreadCount = realGroupMsgs.filter((m) => !m.mine && m.atMs && m.atMs > groupReadAt).length;
  const lastRealGroupMsg = realGroupMsgs.length > 0 ? realGroupMsgs[realGroupMsgs.length - 1] : null;
  // Travelers not already visible via the avatar stack (up to 3) or a DM row.
  const moreTravelersCount = Math.max(travelerCount - 3 - dmThreads.length, 0);

  function markRead(key: string) {
    if (!userId) return;
    setReadMap((prev) => {
      const next = { ...prev, [key]: Date.now() };
      saveReadMap(userId, next);
      return next;
    });
  }

  // Clears the nav/tab-bar "Chat" badge whenever the user is on Chat and
  // there's fresh data — not just once on mount. AuthProvider's realtime
  // notifications subscription sets hasUnreadMessages back to true on
  // *any* new notification, even one for a conversation the user is
  // actively looking at right now, so it needs to be re-cleared every time
  // dmThreads/groupMessages actually change (i.e. every time new data has
  // been seen), or a message arriving while already on this page would
  // leave the badge stuck on with nothing left to clear it.
  //
  // This has to be a real effect, not a render-time sync — markChatSeen
  // updates state that lives in AuthProvider, a different component, and
  // updating another component's state synchronously during this
  // component's render throws ("Cannot update a component while rendering a
  // different component"). Render-time state syncing is only safe for a
  // component's own local state (see the syncs below).
  useEffect(() => {
    if (userId) markChatSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dmThreads, groupMessages]);

  // The following are render-time state syncs, not effects — each guarded
  // by a "have I already synced this exact value" state so it only fires
  // when its trigger actually changes, same pattern as OnboardingWizard's
  // step-init sync. Safe here because readMap is this component's own
  // local state.

  // Loads this device's per-conversation read timestamps.
  const [readMapLoadedForUser, setReadMapLoadedForUser] = useState<string | null>(null);
  if (userId && userId !== readMapLoadedForUser) {
    setReadMapLoadedForUser(userId);
    setReadMap(loadReadMap(userId));
  }

  // First-time safety notices - one for group chat, one for DMs, each shown
  // exactly once ever (until dismissed) regardless of how many sailings or
  // threads the user has.
  const [groupSafetyNoticeCheckedFor, setGroupSafetyNoticeCheckedFor] = useState<string | null>(null);
  const [showGroupSafetyNotice, setShowGroupSafetyNotice] = useState(false);
  if (userId && userId !== groupSafetyNoticeCheckedFor) {
    setGroupSafetyNoticeCheckedFor(userId);
    setShowGroupSafetyNotice(!loadSafetyNoticeSeen(userId, "group"));
  }
  const [dmSafetyNoticeCheckedFor, setDmSafetyNoticeCheckedFor] = useState<string | null>(null);
  const [showDmSafetyNotice, setShowDmSafetyNotice] = useState(false);
  if (userId && userId !== dmSafetyNoticeCheckedFor) {
    setDmSafetyNoticeCheckedFor(userId);
    setShowDmSafetyNotice(!loadSafetyNoticeSeen(userId, "dm"));
  }
  function dismissGroupSafetyNotice() {
    setShowGroupSafetyNotice(false);
    if (userId) saveSafetyNoticeSeen(userId, "group");
  }
  function dismissDmSafetyNotice() {
    setShowDmSafetyNotice(false);
    if (userId) saveSafetyNoticeSeen(userId, "dm");
  }

  // Picks the sailing chip that opens by default: whatever the user had
  // open last time if it's still valid, otherwise the soonest-departing
  // sailing that still has something unread, otherwise just the soonest.
  // The unread-based fallback has to wait for sailingUnread to load (which
  // itself needs mySailings), so this can run across a couple of renders
  // rather than deciding everything on the first one.
  if (!sailingSelectionInitialized && userId && mySailings.length > 0) {
    const persisted = loadActiveSailingPref(userId);
    const stillValid = persisted && mySailings.some((s) => s.id === persisted);
    if (stillValid) {
      setSailingSelectionInitialized(true);
      setActiveSailingIdState(persisted);
    } else if (sailingUnread !== null) {
      const ordered = [...mySailings].sort((a, b) => sailingDateKey(a.id).localeCompare(sailingDateKey(b.id)));
      const withUnread = ordered.find((s) => (sailingUnread[s.id] ?? 0) > 0);
      setSailingSelectionInitialized(true);
      setActiveSailingIdState((withUnread ?? ordered[0]).id);
    }
  }

  // Whichever pane (group or a DM thread) is currently open is, by definition,
  // being read — keep its read timestamp fresh as new messages arrive so it
  // never shows as unread while the user is looking right at it.
  const groupReadKey = pane.type === "group" && activeSailing ? `group:${activeSailing.id}` : null;
  const groupReadSignature = groupReadKey ? `${groupReadKey}:${groupMessages.length}` : null;
  const [syncedGroupReadSignature, setSyncedGroupReadSignature] = useState<string | null>(null);
  if (groupReadKey && groupReadSignature !== syncedGroupReadSignature) {
    setSyncedGroupReadSignature(groupReadSignature);
    markRead(groupReadKey);
  }

  const dmReadKey = pane.type === "dm" ? `dm:${pane.id}` : null;
  const dmReadSignature = dmReadKey ? `${dmReadKey}:${dmMessages.length}` : null;
  const [syncedDmReadSignature, setSyncedDmReadSignature] = useState<string | null>(null);
  if (dmReadKey && dmReadSignature !== syncedDmReadSignature) {
    setSyncedDmReadSignature(dmReadSignature);
    markRead(dmReadKey);
  }

  // Restores a never-sent draft when opening (or switching to) a DM thread.
  const [draftLoadedForThread, setDraftLoadedForThread] = useState<string | null>(null);
  if (userId && activeDmThreadId && activeDmThreadId !== draftLoadedForThread) {
    setDraftLoadedForThread(activeDmThreadId);
    setDmDraft(loadDmDraft(userId, activeDmThreadId));
  }

  function updateDmDraft(text: string) {
    setDmDraft(text);
    if (userId && activeDmThreadId) saveDmDraft(userId, activeDmThreadId, text);
  }

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

  // Member lookup for the active sailing: join rank (Pioneer badge),
  // avatar, and LGBTQ+ status, so group-chat sender lines can show a
  // gutter avatar and the one-badge-slot rule (§3.2-3.3). Also counts
  // this-week joins for the group card's status ladder (§8d, state 3).
  // Join rank/LGBTQ+ status don't change once set, and avatar changes are
  // rare enough that a plain fetch on sailing switch is enough - no
  // realtime subscription needed.
  useEffect(() => {
    if (!activeSailing) return;
    let cancelled = false;
    supabase
      .from("joined_sailings")
      .select("user_id,join_rank,profile,joined_at")
      .eq("sailing_id", activeSailing.id)
      .then(async ({ data }) => {
        if (cancelled || !data) return;
        const userIds = data.map((r) => r.user_id);
        const { data: profileRows } = await supabase.from("profiles").select("id,avatar,avatar_tint").in("id", userIds);
        if (cancelled) return;
        const avatarById = new Map(
          (profileRows ?? []).map((p) => [p.id, sanitizeAvatar(p.avatar, p.avatar_tint)])
        );
        const info: Record<string, MemberInfo> = {};
        const weekAgo = Date.now() - 7 * 86400000;
        let recentJoins = 0;
        for (const r of data) {
          const av = avatarById.get(r.user_id) ?? { emoji: DEFAULT_AVATAR_EMOJI, tint: DEFAULT_AVATAR_TINT };
          const profile = r.profile as OnboardingProfile | null;
          info[r.user_id] = {
            joinRank: r.join_rank,
            avatarEmoji: av.emoji,
            avatarTint: av.tint,
            lgbtq: profile?.lgbtq ?? false,
            partyType: profile?.partyType ?? "solo",
            ageLabel: profile?.ageRanges?.map((a) => a.replace("-", "–")).join(", ") ?? "",
            country: profile?.country || undefined,
            goals: (profile?.goals ?? []).map((gid) => GOALS.find((g) => g.id === gid)?.label ?? gid),
          };
          if (new Date(r.joined_at).getTime() > weekAgo) recentJoins += 1;
        }
        setMemberInfo(info);
        setJoinsThisWeek(recentJoins);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSailing, supabase]);

  // Who this user has blocked - gates the DM composer and drives the
  // Block/Unblock action in the profile peek card. Only ever reads rows
  // where we're the blocker (RLS), so this never reveals who has blocked us.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", userId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setBlockedIds(new Set(data.map((r) => r.blocked_id)));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  // Sidebar DM thread list for the active sailing — refetched on any DM
  // insert/update the user is a participant of (not just the currently-open
  // thread), so a message landing in a thread you're not looking at still
  // updates its preview/unread state without needing to leave and re-enter
  // Chat. Not filtered to a specific thread_id since we don't know the
  // user's thread ids ahead of time; RLS already limits what postgres_changes
  // delivers to threads this user is actually part of.
  useEffect(() => {
    if (!activeSailing || !userId) return;
    const sailingId = activeSailing.id;
    const myId = userId;
    let cancelled = false;

    function refresh() {
      fetchDmThreads(supabase, sailingId, myId).then((list) => {
        if (!cancelled) setDmThreads(list);
      });
    }
    refresh();

    const channel = supabase
      .channel(`dm-threads-sidebar:${sailingId}:${myId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages" }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeSailing, userId, supabase]);

  // Unread count per joined sailing, for the chip row's badges - covers
  // every sailing, not just the active one, so switching chips doesn't
  // require a round trip just to find out what's waiting elsewhere.
  // Refetches on any group/DM insert anywhere (RLS scopes what actually
  // arrives) rather than just the active sailing's channel above.
  useEffect(() => {
    if (!userId || mySailings.length === 0) return;
    const myId = userId;
    let cancelled = false;

    function refreshAll() {
      Promise.all(
        mySailings.map(async (s) => [s.id, await fetchSailingUnreadCount(supabase, s.id, myId, readMap)] as const)
      ).then((entries) => {
        if (!cancelled) setSailingUnread(Object.fromEntries(entries));
      });
    }
    refreshAll();

    const channel = supabase
      .channel(`chat-sailing-unread:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, refreshAll)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, refreshAll)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [mySailings, userId, readMap, supabase]);

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
      try {
        const threadId = await findOrCreateThread(supabase, sailingParam, userId, withId);
        const list = await fetchDmThreads(supabase, sailingParam, userId);
        setDmThreads(list);
        setPane({ type: "dm", id: threadId });
        enterThreadHistory();
        setMobileShowingThread(true);
      } catch {
        // Most likely a block between the two of you - refused at the DB
        // level. Nothing to open; just clean up the URL below.
      }
      router.replace("/chat");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userId, activeSailingId, supabase, router, setActiveSailingId]);

  // Deep link from the admin dashboard: /chat?sailing=<sailingId> - opens
  // that sailing's group pane directly. Silently no-ops if the current
  // user isn't a member of that sailing (e.g. an admin viewing a report for
  // a sailing they never joined) rather than erroring.
  useEffect(() => {
    const withId = searchParams.get("with");
    const sailingParam = searchParams.get("sailing");
    if (withId || !sailingParam || !userId) return;
    if (groupDeepLinkHandled.current === sailingParam) return;
    if (!mySailings.some((s) => s.id === sailingParam)) return;
    groupDeepLinkHandled.current = sailingParam;
    (async () => {
      setActiveSailingId(sailingParam);
      setPane({ type: "group" });
      enterThreadHistory();
      setMobileShowingThread(true);
      router.replace("/chat");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userId, mySailings, router, setActiveSailingId]);

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

  // Keeps the active sailing chip in view when it's selected (including the
  // initial default selection), so a chip picked from off-screen doesn't
  // leave the user wondering which one is active.
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeSailingId]);

  function selectSailing(id: string) {
    setActiveSailingId(id);
    setPane({ type: "group" });
  }

  /** Pushes exactly one history entry per list→thread transition on
   * mobile, so Android back / iOS swipe-back close the thread instead of
   * exiting the app. Guarded on "already showing" so re-opening (e.g.
   * switching which DM is open) never pushes a second entry. */
  function enterThreadHistory() {
    if (typeof window === "undefined" || window.innerWidth >= 768 || mobileShowingThread) return;
    window.history.pushState({ chatThread: true }, "");
  }

  function openGroupPane() {
    setPane({ type: "group" });
    enterThreadHistory();
    setMobileShowingThread(true);
  }

  function openDm(id: string) {
    setPane({ type: "dm", id });
    enterThreadHistory();
    setMobileShowingThread(true);
  }

  /** pop=false is for the popstate handler itself - it must never call
   * history.back(), or it would just re-trigger this same listener. */
  function backToList(pop = true) {
    setMobileShowingThread(false);
    if (pop && typeof window !== "undefined" && window.history.state?.chatThread) window.history.back();
  }

  useEffect(() => {
    function onPopState() {
      setMobileShowingThread((was) => (was ? false : was));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Lets the mobile tab bar's Chat tab close an open thread on re-tap
  // instead of doing nothing (the tab is already lit, so a second tap with
  // no visible effect otherwise reads as the app being stuck).
  useEffect(() => {
    registerChatThreadCloser(() => {
      if (!mobileShowingThread) return false;
      backToList();
      return true;
    });
    return () => registerChatThreadCloser(null);
  }, [mobileShowingThread]);

  // Lets someone jump straight from a sender's name in the group chat into a
  // private thread with them, without leaving the page - same
  // find-or-create-then-open flow as the /chat?with= deep link.
  async function openDmWithSender(senderId: string) {
    if (!userId || !activeSailing || senderId === userId) return;
    let threadId: string;
    try {
      threadId = await findOrCreateThread(supabase, activeSailing.id, userId, senderId);
    } catch {
      // Most likely a block between the two of you - refused at the DB
      // level, so there's nothing to open.
      return;
    }
    const list = await fetchDmThreads(supabase, activeSailing.id, userId);
    setDmThreads(list);
    openDm(threadId);
  }

  // Block/unblock (§ passenger safety): enforced server-side on both new
  // threads and new messages, in either direction - this just keeps the
  // local blockedIds set (and thus the composer/peek-card UI) in sync.
  async function toggleBlock(targetId: string, targetName: string) {
    if (!userId) return;
    const alreadyBlocked = blockedIds.has(targetId);
    if (!alreadyBlocked) {
      const confirmed = window.confirm(
        `Block ${targetName}? They won't be able to message you, and you won't be able to message them. You can unblock them later.`
      );
      if (!confirmed) return;
      await supabase.from("blocked_users").insert({ blocker_id: userId, blocked_id: targetId });
      setBlockedIds((prev) => new Set(prev).add(targetId));
    } else {
      await supabase.from("blocked_users").delete().eq("blocker_id", userId).eq("blocked_id", targetId);
      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }

  // Lets someone on a still-empty sailing invite others straight to it,
  // rather than just to the homepage - same native-share-with-clipboard-
  // fallback pattern as NavBar's shareSite().
  const [sailingShared, setSailingShared] = useState(false);
  async function shareSailing() {
    if (!activeSailing) return;
    const url = `https://samesailing.com/sailing/${activeSailing.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${activeSailing.shipName} on SameSailing`, url });
      } catch {
        // user dismissed the native share sheet — nothing to do
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setSailingShared(true);
    setTimeout(() => setSailingShared(false), 2000);
  }

  // Profile peek (§5): tapping a sender's name/avatar opens a card instead
  // of jumping straight into a DM - sending a message is now an explicit
  // choice inside the card, not the only outcome of the tap.
  function openProfilePeek(senderId: string, senderName: string, event: React.MouseEvent) {
    if (!userId || senderId === userId) return;
    setProfilePeek({ senderId, senderName, x: event.clientX, y: event.clientY });
  }
  function closeProfilePeek() {
    setProfilePeek(null);
  }
  function messageFromPeek() {
    if (!profilePeek) return;
    const senderId = profilePeek.senderId;
    closeProfilePeek();
    openDmWithSender(senderId);
  }
  useEffect(() => {
    if (!profilePeek) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeProfilePeek();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [profilePeek]);

  function reportGroupMessage(msg: ChatMessage) {
    if (!msg.userId) return;
    setReportTarget({
      userId: msg.userId,
      label: msg.sender,
      sailingId: activeSailing?.id ?? null,
      message: { id: msg.id, kind: "group_message", preview: msg.body },
    });
  }

  function reportDmMessage(msg: ChatMessage) {
    if (!msg.userId) return;
    setReportTarget({
      userId: msg.userId,
      label: activeThread?.label ?? msg.sender,
      sailingId: activeSailing?.id ?? null,
      message: { id: msg.id, kind: "dm_message", preview: msg.body },
    });
  }

  async function sendGroup() {
    const text = groupDraft.trim();
    if (!text || !activeSailing || !userId) return;
    setGroupDraft("");
    const senderLabel = myDisplayName(activeSailing.profile?.partyType ?? null).name;
    await supabase.from("group_messages").insert({
      sailing_id: activeSailing.id,
      user_id: userId,
      sender_label: senderLabel,
      body: text,
    });
  }

  async function deleteGroupMessage(id: string, mine: boolean) {
    if (!userId) return;
    if (mine) {
      await supabase.from("group_messages").update({ deleted: true }).eq("id", id).eq("user_id", userId);
    } else {
      if (!isAdmin) return;
      await supabase.rpc("admin_delete_message", { message_kind: "group_message", message_id: id });
    }
    setRealGroupMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, body: "" } : m)));
  }

  async function sendDm() {
    const text = dmDraft.trim();
    if (!text || !activeDmThreadId || !userId || !activeSailing) return;
    setDmDraft("");
    saveDmDraft(userId, activeDmThreadId, "");
    const { error } = await supabase.from("dm_messages").insert({
      thread_id: activeDmThreadId,
      sender_id: userId,
      sender_label: myDisplayName(activeSailing.profile?.partyType ?? null).name,
      body: text,
    });
    if (error) {
      // Most likely the other person has blocked us - our own blockedIds
      // can't detect that (RLS only shows blocks we made), so this is the
      // only place that surfaces it. Restore the draft rather than
      // silently losing what they typed.
      setDmDraft(text);
      window.alert("Couldn't send that message. This conversation may no longer be available.");
      return;
    }
    fetchDmThreads(supabase, activeSailing.id, userId).then(setDmThreads);
  }

  async function deleteDmMessage(id: string, mine: boolean) {
    if (!userId) return;
    if (mine) {
      await supabase.from("dm_messages").update({ deleted: true }).eq("id", id).eq("sender_id", userId);
    } else {
      if (!isAdmin) return;
      await supabase.rpc("admin_delete_message", { message_kind: "dm_message", message_id: id });
    }
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
    <main className="flex h-[calc(100vh-60px)] overflow-hidden pt-[62px] md:h-screen">
      {/* SIDEBAR */}
      <div
        className={`w-full shrink-0 flex-col border-r border-border bg-white md:flex md:w-[312px] ${
          mobileShowingThread ? "hidden" : "flex"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-[#f3fbfb] px-4 py-3.5">
          <div className="font-display text-[20px] font-bold text-charcoal">Messages</div>
          <InstallAppButton compact />
        </div>

        {orderedSailings.length > 1 ? (
          <div className="relative shrink-0 border-b border-border bg-[#f3fbfb]">
            <div
              ref={chipRowRef}
              className="flex gap-1.75 overflow-x-auto px-3.5 py-2.75 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {orderedSailings.map((s) => {
                const active = s.id === activeSailing.id;
                const count = sailingUnread?.[s.id] ?? 0;
                return (
                  <button
                    key={s.id}
                    ref={active ? activeChipRef : null}
                    type="button"
                    onClick={() => selectSailing(s.id)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.25 py-1.75 font-sans text-[12.5px] font-bold transition-colors ${
                      active ? "bg-teal text-white" : "border border-[#d8ebec] bg-white text-[#4c6d72] font-semibold"
                    }`}
                  >
                    {shortLabels.get(s.id) ?? s.shipName}
                    {count > 0 ? (
                      <span className={active ? "ml-1 opacity-70" : "ml-1 text-coral"}>{count > 9 ? "9+" : count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-[#f3fbfb] to-transparent"
            />
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          <div className="px-3.5 pb-2 pt-3.5 text-[10.5px] font-bold tracking-[.09em] text-[#8aa6aa]">
            GROUP CHAT
          </div>
          <button
            type="button"
            onClick={openGroupPane}
            style={{ background: "linear-gradient(135deg,#0E8C99,#0a6f7a)", boxShadow: "0 10px 22px rgba(14,140,153,.30)" }}
            className={`mx-2 mb-1.5 flex w-[calc(100%-16px)] flex-col gap-2.75 rounded-2xl p-3.5 text-left transition-transform ${
              pane.type === "group" ? "" : "hover:-translate-y-px"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 text-[22px]">⛴️</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-bold text-white">{activeSailing.shipName}</div>
                <div className="mt-px truncate text-[11px] font-medium text-white/85">
                  Group chat · {travelerCount} traveler{travelerCount === 1 ? "" : "s"}
                </div>
              </div>
              {groupUnreadCount > 0 ? (
                <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-white px-1.5 text-[12px] font-extrabold text-teal">
                  {groupUnreadCount > 9 ? "9+" : groupUnreadCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0">
                {Object.entries(memberInfo)
                  .filter(([id]) => id !== userId)
                  .slice(0, 3)
                  .map(([id, m], i) => (
                    <span key={id} className={i > 0 ? "-ml-2.5 rounded-full" : "rounded-full"} style={{ boxShadow: "0 0 0 2px #0a6f7a" }}>
                      <Avatar emoji={m.avatarEmoji} tint={m.avatarTint} size={26} />
                    </span>
                  ))}
              </div>
              <span className="truncate text-[11px] font-semibold text-white">
                {groupStatusLine(groupUnreadCount, lastRealGroupMsg?.atMs ? { senderName: lastRealGroupMsg.sender, atMs: lastRealGroupMsg.atMs } : null, joinsThisWeek)}
              </span>
            </div>
          </button>

          {dmThreads.length === 0 ? (
            <div className="px-3.5 py-4 text-center text-xs leading-relaxed text-muted-2">
              Nobody messaged yet.{" "}
              <Link href={`/sailing/${activeSailing.id}/board`} className="font-semibold text-teal">
                Browse passengers
              </Link>{" "}
              to start a private chat.
            </div>
          ) : (
            <>
              <div className="px-3.5 pb-2 pt-3.5 text-[10.5px] font-bold tracking-[.09em] text-[#8aa6aa]">
                DIRECT MESSAGES
              </div>
              <div className="mx-3.5 overflow-hidden rounded-2xl border border-[#e7f1f2] bg-white">
                {dmThreads.map((t, i) => {
                  const dmReadAt = readMap[`dm:${t.id}`] ?? 0;
                  const unreadCount = t.otherMessageTimestamps.filter((ms) => ms > dmReadAt).length;
                  const unread = unreadCount > 0;
                  const draft = userId ? loadDmDraft(userId, t.id) : "";
                  const showDraft = t.lastMessageAtMs === 0 && !!draft;
                  const hasPreview = showDraft || !!t.preview;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openDm(t.id)}
                      className={`relative flex w-full items-center gap-2.5 px-3 py-2.75 text-left transition-colors hover:bg-input ${
                        pane.type === "dm" && pane.id === t.id ? "bg-teal-tint" : unread ? "bg-[#f8fdfd]" : ""
                      }`}
                    >
                      {i < dmThreads.length - 1 ? (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 ml-[58px] h-px bg-[#eef6f6]" />
                      ) : null}
                      <Avatar emoji={t.avatarEmoji} tint={t.avatarTint} size={42} />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`flex items-center gap-1.5 truncate text-[13.5px] leading-[1.25] text-charcoal ${unread ? "font-bold" : "font-semibold"}`}
                        >
                          <span className="truncate">{t.label}</span>
                          {t.anon ? (
                            <span className="shrink-0 rounded-full bg-[#f2f7f7] px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.05em] text-[#9db4b7] uppercase">
                              Anon
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={`mt-0.5 truncate text-[12px] ${
                            showDraft ? "italic text-[#9db4b7]" : unread ? "font-semibold text-charcoal" : "text-[#5f8288]"
                          }`}
                        >
                          {showDraft ? `Draft · ${draft}` : hasPreview ? t.preview : "No messages yet"}
                        </div>
                      </div>
                      <div className="shrink-0 self-start text-right">
                        {unread ? (
                          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal px-1.5 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : (
                          <span className="text-[15px] text-[#9fb9bc]">›</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {moreTravelersCount > 0 ? (
            <Link
              href={`/sailing/${activeSailing.id}/board`}
              className="mx-3.5 mt-4 mb-4.5 flex items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[#cfe6e8] p-3.75 transition-colors hover:border-teal"
            >
              <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-teal-tint text-[17px] text-teal">
                🧑‍🤝‍🧑
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-charcoal">
                  {moreTravelersCount} more traveler{moreTravelersCount === 1 ? "" : "s"} aboard
                </span>
                <span className="block text-[11.5px] text-muted-2">Browse the passenger board</span>
              </span>
              <span className="shrink-0 text-[16px] text-[#9fb9bc]">›</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* GROUP PANE */}
      {pane.type === "group" ? (
        <div className={`flex-1 flex-col overflow-hidden md:flex ${mobileShowingThread ? "flex" : "hidden"}`}>
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-white px-4.5 py-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => backToList()}
                className="mr-0.5 flex shrink-0 items-center gap-0.5 rounded-full py-1.5 pr-2.5 pl-1.5 font-sans text-[13px] font-semibold text-teal transition-colors hover:bg-[#f0f9f9] md:hidden"
                aria-label="Back to all chats"
              >
                ‹ Chats
              </button>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-charcoal">
                  🚢 {activeSailing.shipName}
                </div>
                <div className="truncate text-xs text-muted-2">
                  {activeSailing.date} · from {activeSailing.port} · {travelerCount} travelers
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

          {showGroupSafetyNotice ? (
            <div className="shrink-0 px-4.5 pt-3">
              <SafetyNotice
                text="Never share payment details, passwords, or financial info in the group chat - no legitimate reason ever requires it."
                onDismiss={dismissGroupSafetyNotice}
              />
            </div>
          ) : null}

          <div className="relative flex-1 overflow-hidden">
            <div ref={groupContainerRef} className="flex h-full flex-col gap-2.5 overflow-y-auto px-4.5 py-3.5">
              {travelerCount <= 1 ? (
                <div className="rounded-2xl border border-[#b9e5e8] bg-teal-tint px-4 py-3.5">
                  <div className="text-sm font-bold text-charcoal">🚀 You&apos;re the first one here!</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    SameSailing just launched, so this sailing is still filling up. Share it with fellow
                    passengers so they can find their way here too - new travelers join every day.
                  </p>
                  <button
                    type="button"
                    onClick={shareSailing}
                    className="mt-2.5 rounded-[9px] border-[1.5px] border-[#b9e5e8] bg-white px-3.5 py-1.5 font-sans text-xs font-semibold text-teal transition-colors hover:border-teal"
                  >
                    {sailingShared ? "Copied!" : "📤 Share this sailing"}
                  </button>
                </div>
              ) : null}
              {groupRuns.map((run) => (
                <div key={run.key} className="flex flex-col gap-2.5">
                  {run.day ? <DayDivider label={run.day} /> : null}
                  <MessageRunView
                    run={run}
                    memberInfo={memberInfo}
                    isDeletable={(m) => realIds.has(m.id)}
                    isAdmin={isAdmin}
                    onDelete={deleteGroupMessage}
                    onSenderClick={openProfilePeek}
                    onReport={reportGroupMessage}
                  />
                </div>
              ))}
            </div>
            <button
              ref={groupPillRef}
              type="button"
              onClick={() => groupScroll.scrollToBottom("smooth")}
              style={{ display: "none" }}
              className="absolute bottom-3 left-1/2 items-center gap-1.5 rounded-full bg-teal px-4 py-2 font-sans text-xs font-semibold text-white shadow-[0_4px_14px_rgba(14,140,153,.35)] transition-transform -translate-x-1/2 hover:scale-105"
            >
              ↓ New message
            </button>
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
              Sending as <strong className="font-semibold text-muted">{groupSenderName}</strong>
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
                onClick={() => backToList()}
                className="mr-0.5 flex shrink-0 items-center gap-0.5 rounded-full py-1.5 pr-2.5 pl-1.5 font-sans text-[13px] font-semibold text-teal transition-colors hover:bg-[#f0f9f9] md:hidden"
                aria-label="Back to all chats"
              >
                ‹ Chats
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-[13px] font-bold text-charcoal">
                  <span className="truncate">{activeThread?.label ?? "Conversation"}</span>
                  {activeThread ? (() => {
                    const badge = badgeForRank(activeThread.joinRank);
                    return badge ? <CompactBadge badge={badge} /> : null;
                  })() : null}
                </div>
                <div className="text-xs text-muted-2">{shortLabels.get(activeSailing.id) ?? activeSailing.shipName}</div>
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

          {showDmSafetyNotice ? (
            <div className="shrink-0 px-4.5 pt-3">
              <SafetyNotice
                text="Private messages are just between you two - but never send payment details, passwords, or financial info, even if asked."
                onDismiss={dismissDmSafetyNotice}
              />
            </div>
          ) : null}

          <div className="relative flex-1 overflow-hidden">
            <div ref={dmContainerRef} className="flex h-full flex-col gap-2.5 overflow-y-auto px-4.5 py-3.5">
              <DayDivider label="Conversation history" />
              {dmRuns.map((run) => (
                <MessageRunView
                  key={run.key}
                  run={run}
                  memberInfo={memberInfo}
                  isDeletable={() => true}
                  isAdmin={isAdmin}
                  onDelete={deleteDmMessage}
                  onSenderClick={openProfilePeek}
                  onReport={reportDmMessage}
                />
              ))}
            </div>
            <button
              ref={dmPillRef}
              type="button"
              onClick={() => dmScroll.scrollToBottom("smooth")}
              style={{ display: "none" }}
              className="absolute bottom-3 left-1/2 items-center gap-1.5 rounded-full bg-teal px-4 py-2 font-sans text-xs font-semibold text-white shadow-[0_4px_14px_rgba(14,140,153,.35)] transition-transform -translate-x-1/2 hover:scale-105"
            >
              ↓ New message
            </button>
          </div>

          <div className="shrink-0 border-t border-border bg-white px-5.5 py-3.5">
            {activeThread && blockedIds.has(activeThread.otherUserId) ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-input px-3.5 py-3">
                <span className="text-[12.5px] text-muted">You&apos;ve blocked {activeThread.label}.</span>
                <button
                  type="button"
                  onClick={() => toggleBlock(activeThread.otherUserId, activeThread.label)}
                  className="shrink-0 rounded-[9px] border-[1.5px] border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
                >
                  Unblock
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2.5">
                  <textarea
                    value={dmDraft}
                    onChange={(e) => updateDmDraft(e.target.value)}
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
              </>
            )}
          </div>
        </div>
      ) : null}

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />

      {profilePeek ? (
        <ProfilePeekCard
          peek={profilePeek}
          info={memberInfo[profilePeek.senderId]}
          isBlocked={blockedIds.has(profilePeek.senderId)}
          onClose={closeProfilePeek}
          onMessage={messageFromPeek}
          onToggleBlock={() => toggleBlock(profilePeek.senderId, profilePeek.senderName)}
        />
      ) : null}
    </main>
  );
}
