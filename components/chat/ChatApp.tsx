"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, type OnboardingProfile } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useTravelerCount } from "@/lib/useTravelerCount";
import { resolveDisplayName, type NameFields } from "@/lib/displayName";
import { findOrCreateThread } from "@/lib/dmThreads";
import { GROUP_SEED_MESSAGES, formatTimeLabel, chatListTimeLabel, type ChatMessage } from "@/lib/chatData";
import { sailingDateKey, shortSailingLabels } from "@/lib/sailingLabel";
import { badgeForRank, type Badge } from "@/lib/pioneer";
import { CompactBadge } from "@/components/ui/PioneerBadge";
import InstallAppButton from "@/components/ui/InstallAppButton";
import ReportModal, { type ReportTarget } from "@/components/ui/ReportModal";
import Avatar from "@/components/ui/Avatar";
import { sanitizeAvatar, DEFAULT_AVATAR_EMOJI, DEFAULT_AVATAR_TINT } from "@/lib/avatars";

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

function MessageBubble({
  msg,
  deletable,
  onDelete,
  badge,
  onMessageSender,
  onReport,
}: {
  msg: ChatMessage;
  deletable?: boolean;
  onDelete?: (id: string) => void;
  badge?: Badge | null;
  /** Only meaningful for group messages - DM bubbles already know who they're with. */
  onMessageSender?: (senderId: string) => void;
  onReport?: (msg: ChatMessage) => void;
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
    <div className={`max-w-[74%] ${msg.mine ? "self-end" : "self-start"}`}>
      <div
        className={`mb-1 flex items-center gap-2 text-[11px] font-semibold ${msg.mine ? "justify-end pr-0.5 text-muted-2" : "pl-0.5 text-teal"}`}
      >
        {msg.mine && deletable && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(msg.id)}
            className="text-[10px] font-normal text-muted-2 underline decoration-dotted hover:text-coral"
          >
            Delete
          </button>
        ) : null}
        {!msg.mine && msg.userId && onReport ? (
          <button
            type="button"
            onClick={() => onReport(msg)}
            className="text-[10px] font-normal text-muted-2 underline decoration-dotted hover:text-coral"
          >
            Report
          </button>
        ) : null}
        {msg.sender}
        {badge ? <CompactBadge badge={badge} /> : null}
        {!msg.mine && msg.userId && onMessageSender ? (
          <button
            type="button"
            onClick={() => onMessageSender(msg.userId!)}
            title={`Message ${msg.sender}`}
            aria-label={`Send a private message to ${msg.sender}`}
            className="opacity-60 transition-opacity hover:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6.5h16v11H8.5L4 20.5z" />
            </svg>
          </button>
        ) : null}
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
  const { loading, loggedIn, mySailings, userId, markChatSeen, myDisplayName } = useAuth();
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
  // Pioneer badge rank per member of the active sailing, for the compact
  // ribbon next to a group-chat sender's name.
  const [memberJoinRanks, setMemberJoinRanks] = useState<Record<string, number | null>>({});
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

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

  // Pioneer badge lookup for the active sailing's members, so group-chat
  // sender lines can show a compact ribbon. Join order doesn't change once
  // assigned, so a plain fetch on sailing switch is enough - no realtime
  // subscription needed.
  useEffect(() => {
    if (!activeSailing) return;
    let cancelled = false;
    supabase
      .from("joined_sailings")
      .select("user_id,join_rank")
      .eq("sailing_id", activeSailing.id)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMemberJoinRanks(Object.fromEntries(data.map((r) => [r.user_id, r.join_rank])));
      });
    return () => {
      cancelled = true;
    };
  }, [activeSailing, supabase]);

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
      const threadId = await findOrCreateThread(supabase, sailingParam, userId, withId);
      const list = await fetchDmThreads(supabase, sailingParam, userId);
      setDmThreads(list);
      setPane({ type: "dm", id: threadId });
      setMobileShowingThread(true);
      router.replace("/chat");
    })();
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
      setMobileShowingThread(true);
      router.replace("/chat");
    })();
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

  // Lets someone jump straight from a sender's name in the group chat into a
  // private thread with them, without leaving the page - same
  // find-or-create-then-open flow as the /chat?with= deep link.
  async function openDmWithSender(senderId: string) {
    if (!userId || !activeSailing || senderId === userId) return;
    const threadId = await findOrCreateThread(supabase, activeSailing.id, userId, senderId);
    const list = await fetchDmThreads(supabase, activeSailing.id, userId);
    setDmThreads(list);
    openDm(threadId);
  }

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

  async function deleteGroupMessage(id: string) {
    if (!userId) return;
    await supabase.from("group_messages").update({ deleted: true }).eq("id", id).eq("user_id", userId);
    setRealGroupMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, body: "" } : m)));
  }

  async function sendDm() {
    const text = dmDraft.trim();
    if (!text || !activeDmThreadId || !userId || !activeSailing) return;
    setDmDraft("");
    saveDmDraft(userId, activeDmThreadId, "");
    await supabase.from("dm_messages").insert({
      thread_id: activeDmThreadId,
      sender_id: userId,
      sender_label: myDisplayName(activeSailing.profile?.partyType ?? null).name,
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
    <main className="flex h-[calc(100vh-62px-60px)] overflow-hidden pt-[62px] md:h-[calc(100vh-62px)]">
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
            EVERYONE ON THIS SAILING
          </div>
          <button
            type="button"
            onClick={openGroupPane}
            className={`flex w-full items-center gap-3 px-3.5 pb-3.5 text-left transition-colors hover:bg-input ${
              pane.type === "group" ? "bg-input" : ""
            }`}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#dff1f2] text-[23px]">
              🚢
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-bold leading-[1.25] text-charcoal">
                {activeSailing.shipName}
              </div>
              <div className="mt-px truncate text-[11px] font-semibold text-teal">
                {activeSailing.date} · from {activeSailing.port}
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-[#6f9297]">
                {lastRealGroupMsg
                  ? lastRealGroupMsg.deleted
                    ? "Message removed"
                    : `${lastRealGroupMsg.sender}: ${lastRealGroupMsg.body}`
                  : `Group chat · ${travelerCount} travelers`}
              </div>
            </div>
            <div className="shrink-0 self-start text-right">
              <div className="text-[11px] text-[#9db4b7]">
                {lastRealGroupMsg?.atMs ? chatListTimeLabel(lastRealGroupMsg.atMs) : ""}
              </div>
              {groupUnreadCount > 0 ? (
                <div className="mt-1 inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-coral px-[5px] text-[10.5px] font-bold text-white">
                  {groupUnreadCount > 9 ? "9+" : groupUnreadCount}
                </div>
              ) : null}
            </div>
          </button>

          <div className="mx-3.5 h-px bg-[#eef4f4]" />

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
                PRIVATE · {dmThreads.length}
              </div>
              {dmThreads.map((t) => {
                const dmReadAt = readMap[`dm:${t.id}`] ?? 0;
                const unreadCount = t.otherMessageTimestamps.filter((ms) => ms > dmReadAt).length;
                const draft = userId ? loadDmDraft(userId, t.id) : "";
                const showDraft = t.lastMessageAtMs === 0 && !!draft;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openDm(t.id)}
                    className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-input ${
                      pane.type === "dm" && pane.id === t.id ? "bg-input" : ""
                    }`}
                  >
                    <Avatar emoji={t.avatarEmoji} tint={t.avatarTint} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate text-[15.5px] font-bold leading-[1.25] text-charcoal">
                        <span className="truncate">{t.label}</span>
                        {t.anon ? (
                          <span className="shrink-0 rounded-full bg-[#f2f7f7] px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.05em] text-[#9db4b7] uppercase">
                            Anon
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={`mt-0.5 truncate text-[12.5px] ${showDraft ? "italic text-[#9db4b7]" : "text-[#6f9297]"}`}
                      >
                        {showDraft ? `Draft · ${draft}` : t.preview}
                      </div>
                    </div>
                    <div className="shrink-0 self-start text-right">
                      <div className="text-[11px] text-[#9db4b7]">{t.timeLabel}</div>
                      {unreadCount > 0 ? (
                        <div className="mt-1 inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-coral px-[5px] text-[10.5px] font-bold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </>
          )}
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
            <div ref={groupContainerRef} className="flex h-full flex-col gap-3.5 overflow-y-auto px-4.5 py-3.5">
              {groupMessages.map((m) => (
                <div key={m.id} className="flex flex-col gap-3.5">
                  {m.day ? <DayDivider label={m.day} /> : null}
                  <MessageBubble
                    msg={m}
                    deletable={realIds.has(m.id)}
                    onDelete={deleteGroupMessage}
                    badge={m.userId ? badgeForRank(memberJoinRanks[m.userId]) : null}
                    onMessageSender={openDmWithSender}
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
                onClick={backToList}
                className="mr-1.5 flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border text-muted md:hidden"
                aria-label="Back to all chats"
              >
                ←
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
            <div ref={dmContainerRef} className="flex h-full flex-col gap-3.5 overflow-y-auto px-4.5 py-3.5">
              <DayDivider label="Conversation history" />
              {dmMessages.map((m) => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  deletable={m.mine}
                  onDelete={deleteDmMessage}
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
          </div>
        </div>
      ) : null}

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />
    </main>
  );
}
