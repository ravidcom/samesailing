"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";
import { resolveDisplayName, type NameMode } from "./displayName";
import { sanitizeAvatar, isValidAvatar, DEFAULT_AVATAR_EMOJI, DEFAULT_AVATAR_TINT } from "./avatars";

export type PartyType = "family" | "couple" | "solo" | "friends";

export type OnboardingProfile = {
  partyType: PartyType;
  ageRanges: string[];
  gender: string | null;
  kids: { gender: string; age: string }[];
  groupSize: string;
  bio: string;
  country: string;
  goals: string[];
  avatar: string;
  lgbtq: boolean;
};

export type JoinedSailing = {
  id: string;
  line: string;
  shipName: string;
  date: string;
  itinerary: string;
  port: string;
  profile: OnboardingProfile | null;
  /** Pioneer badge rank on this sailing (1-10), assigned at join time. Null past slot 10. */
  joinRank: number | null;
};

/** What the client sends to join a sailing - join_rank isn't known until the
 * insert's trigger assigns it, so it can't be part of an outgoing request. */
export type NewSailingJoin = Omit<JoinedSailing, "joinRank">;

export type AuthUser = { name: string; email: string; avatar: string; avatarTint: string };

type SignUpInput = {
  name: string;
  email: string;
  password: string;
  avatar: string;
  country: string;
  sailing: NewSailingJoin | null;
  nameMode?: NameMode;
  nickname?: string;
};

type NotificationSettings = { notifyDigest: boolean; notifyDmAlerts: boolean };

type AuthContextValue = {
  loading: boolean;
  loggedIn: boolean;
  userId: string | null;
  user: AuthUser | null;
  /** False for Google/Facebook accounts — they never set a password to change. */
  hasPassword: boolean;
  isAdmin: boolean;
  country: string;
  notifications: NotificationSettings;
  mySailings: JoinedSailing[];
  hasUnreadMessages: boolean;
  unreadCount: number;
  markChatSeen: () => void;
  nameMode: NameMode;
  nickname: string;
  /** Resolves what I'm labelled as for a given (per-sailing) party type — the handle noun differs by party type, so this needs to know which sailing's context it's being shown in. */
  myDisplayName: (partyType: PartyType | null) => { name: string; anon: boolean };
  refreshUserData: (userId: string) => Promise<void>;
  completeSignUp: (input: SignUpInput) => Promise<{ error?: string }>;
  logIn: (email: string, password: string) => Promise<{ error?: string }>;
  joinSailing: (sailing: NewSailingJoin) => Promise<{ error?: string }>;
  updateSailingProfile: (sailingId: string, profile: OnboardingProfile) => Promise<{ error?: string }>;
  removeSailing: (sailingId: string) => Promise<void>;
  updateAccount: (patch: { nameMode?: NameMode; nickname?: string }) => Promise<void>;
  updateAvatar: (emoji: string, tint: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileRow = {
  id: string;
  name: string;
  country: string;
  avatar: string;
  avatar_tint: string;
  notify_digest: boolean;
  notify_dm_alerts: boolean;
  name_mode: NameMode;
  nickname: string;
};

const PROFILE_COLUMNS = "id,name,country,avatar,avatar_tint,notify_digest,notify_dm_alerts,name_mode,nickname";
type JoinedSailingRow = {
  sailing_id: string;
  line: string;
  ship_name: string;
  sail_date: string;
  itinerary: string;
  port: string;
  profile: OnboardingProfile | null;
  join_rank: number | null;
};

function chatSeenKey(userId: string) {
  return `samesailing:chatSeenAt:${userId}`;
}

/** Epoch string old enough that "no stored value yet" reads as "everything is unread". */
function getChatSeenAt(userId: string): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  return localStorage.getItem(chatSeenKey(userId)) ?? new Date(0).toISOString();
}

function rowToSailing(row: JoinedSailingRow): JoinedSailing {
  return {
    id: row.sailing_id,
    line: row.line,
    shipName: row.ship_name,
    date: row.sail_date,
    itinerary: row.itinerary,
    port: row.port,
    profile: row.profile,
    joinRank: row.join_rank,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [mySailings, setMySailings] = useState<JoinedSailing[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadUserData(userId: string) {
    const [{ data: profileRow }, { data: sailingRows }, { data: moderationRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("joined_sailings")
        .select("sailing_id,line,ship_name,sail_date,itinerary,port,profile,join_rank")
        .eq("user_id", userId),
      supabase.from("user_moderation").select("is_admin,banned").eq("user_id", userId).maybeSingle(),
    ]);
    // Banned accounts get signed out on the spot rather than populated with
    // data they're about to lose access to - this only catches an already-
    // open tab on its next session check (page load or token refresh), not
    // instantly, which is an accepted tradeoff for how simple this is to run.
    if (moderationRow?.banned) {
      await supabase.auth.signOut();
      return;
    }
    setProfile(profileRow ?? null);
    setMySailings((sailingRows ?? []).map(rowToSailing));
    setIsAdmin(moderationRow?.is_admin ?? false);

    // Powers the admin dashboard's "Active users" range stat. supabase-js
    // query builders are lazy thenables - they don't actually send the
    // request until awaited/`.then()`'d, so this needs a real await (not
    // `void ...upsert(...)`, which builds the query and never fires it).
    // Not worth surfacing an error over, so no try/catch.
    await supabase.from("user_activity").upsert({ user_id: userId, last_seen_at: new Date().toISOString() });
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) await loadUserData(session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setProfile(null);
        setMySailings([]);
        setUnreadCount(0);
        setIsAdmin(false);
      }
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drives the "Chat" badge count in the nav/tab bar: how many notifications
  // (group or DM messages) have landed since the user last visited /chat.
  // "Seen" is tracked client-side (localStorage) rather than in the DB —
  // there's no cross-device requirement here, and it keeps this independent
  // of the notify_digest/notify_dm_alerts toggles (those gate the log entry
  // itself, not the badge).
  useEffect(() => {
    const currentUserId = authUser?.id;
    // Resetting to 0 on logout is handled by the onAuthStateChange
    // listener above, alongside clearing profile/mySailings.
    if (!currentUserId) return;
    let cancelled = false;
    const seenAt = getChatSeenAt(currentUserId);
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .gt("created_at", seenAt)
      .then(({ count }) => {
        if (!cancelled) setUnreadCount(count ?? 0);
      });

    const channel = supabase
      .channel(`unread-badge:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [authUser?.id, supabase]);

  function markChatSeen() {
    if (!authUser) return;
    localStorage.setItem(chatSeenKey(authUser.id), new Date().toISOString());
    setUnreadCount(0);
  }

  function myDisplayName(partyType: PartyType | null): { name: string; anon: boolean } {
    if (!authUser) return { name: "Traveler", anon: true };
    return resolveDisplayName(authUser.id, partyType ?? "solo", {
      nameMode: profile?.name_mode ?? "anon",
      nickname: profile?.nickname ?? "",
      name: profile?.name ?? "",
    });
  }

  async function completeSignUp({
    name,
    email,
    password,
    avatar,
    country,
    sailing,
    nameMode,
    nickname,
  }: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user || !data.session) {
      return {
        error:
          "Account created — check your email to confirm it before signing in.",
      };
    }

    const userId = data.user.id;
    // The avatar is chosen in My profile, never during signup - onboarding's
    // party-derived emoji only sticks here if it happens to be a valid
    // account avatar (single codepoint, in one of the avatar sets), which
    // most aren't (couple/family use ZWJ sequences). Otherwise this quietly
    // falls back to the real default instead of looking like a choice.
    const sanitized = sanitizeAvatar(avatar, "peach");
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name,
      country,
      avatar: sanitized.emoji,
      avatar_tint: sanitized.tint,
      name_mode: nameMode ?? "anon",
      nickname: nickname ?? "",
    });
    if (profileError) return { error: profileError.message };

    if (sailing) {
      const { error: sailingError } = await supabase.from("joined_sailings").insert({
        user_id: userId,
        sailing_id: sailing.id,
        line: sailing.line,
        ship_name: sailing.shipName,
        sail_date: sailing.date,
        itinerary: sailing.itinerary,
        port: sailing.port,
        profile: sailing.profile,
      });
      if (sailingError) return { error: sailingError.message };
    }

    await loadUserData(userId);
    return {};
  }

  async function logIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function joinSailing(sailing: NewSailingJoin) {
    if (!authUser) return { error: "You need to be signed in to join a sailing." };
    // A sailing already on the account can't be joined again - that would
    // either silently overwrite the existing row's profile or (if it ever
    // did fire the insert trigger) hand out a second, later join_rank for
    // the same person. Tell them instead of quietly no-oping.
    if (mySailings.some((s) => s.id === sailing.id)) {
      return { error: "You've already joined this sailing." };
    }
    // A plain insert, not an upsert - mySailings already ruled out an
    // existing row above, and letting the table's own (user_id, sailing_id)
    // unique constraint reject a genuine race (e.g. a second tab joining at
    // the same moment) is safer than upsert quietly overwriting it.
    const { error } = await supabase.from("joined_sailings").insert({
      user_id: authUser.id,
      sailing_id: sailing.id,
      line: sailing.line,
      ship_name: sailing.shipName,
      sail_date: sailing.date,
      itinerary: sailing.itinerary,
      port: sailing.port,
      profile: sailing.profile,
    });
    if (error) {
      return { error: error.code === "23505" ? "You've already joined this sailing." : error.message };
    }
    await loadUserData(authUser.id);
    return {};
  }

  async function updateSailingProfile(sailingId: string, profile: OnboardingProfile) {
    if (!authUser) return { error: "You need to be signed in." };
    const { data, error } = await supabase
      .from("joined_sailings")
      .update({ profile })
      .eq("user_id", authUser.id)
      .eq("sailing_id", sailingId)
      .select("sailing_id")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Couldn't save — that sailing wasn't found." };
    setMySailings((prev) => prev.map((s) => (s.id === sailingId ? { ...s, profile } : s)));
    return {};
  }

  async function removeSailing(sailingId: string) {
    if (!authUser) return;
    await supabase
      .from("joined_sailings")
      .delete()
      .eq("user_id", authUser.id)
      .eq("sailing_id", sailingId);
    setMySailings((prev) => prev.filter((s) => s.id !== sailingId));
  }

  async function updateAccount(patch: { nameMode?: NameMode; nickname?: string }) {
    if (!authUser) return;
    const dbPatch: Partial<Pick<ProfileRow, "name_mode" | "nickname">> = {};
    if (patch.nameMode !== undefined) dbPatch.name_mode = patch.nameMode;
    if (patch.nickname !== undefined) dbPatch.nickname = patch.nickname;
    const { data } = await supabase
      .from("profiles")
      .update(dbPatch)
      .eq("id", authUser.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (data) setProfile(data);
  }

  async function updateAvatar(emoji: string, tint: string) {
    if (!authUser) return { error: "You need to be signed in." };
    if (!isValidAvatar(emoji, tint)) return { error: "That avatar isn't available." };
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar: emoji, avatar_tint: tint })
      .eq("id", authUser.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (error) return { error: error.message };
    if (data) setProfile(data);
    return {};
  }

  async function updateNotificationSettings(patch: Partial<NotificationSettings>) {
    if (!authUser) return;
    const dbPatch: Partial<Pick<ProfileRow, "notify_digest" | "notify_dm_alerts">> = {};
    if (patch.notifyDigest !== undefined) dbPatch.notify_digest = patch.notifyDigest;
    if (patch.notifyDmAlerts !== undefined) dbPatch.notify_dm_alerts = patch.notifyDmAlerts;
    const { data } = await supabase
      .from("profiles")
      .update(dbPatch)
      .eq("id", authUser.id)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (data) setProfile(data);
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc("delete_own_account");
    if (error) return { error: error.message };
    // The account (and its session) no longer exists server-side - drop the
    // local session too so the app doesn't keep treating this tab as signed in.
    await supabase.auth.signOut();
    return {};
  }

  const value: AuthContextValue = {
    loading,
    loggedIn: !!authUser,
    userId: authUser?.id ?? null,
    user: authUser
      ? {
          name: profile?.name ?? "Traveler",
          email: authUser.email ?? "-",
          avatar: profile?.avatar ?? DEFAULT_AVATAR_EMOJI,
          avatarTint: profile?.avatar_tint ?? DEFAULT_AVATAR_TINT,
        }
      : null,
    hasPassword: authUser?.app_metadata?.provider === "email",
    isAdmin,
    country: profile?.country ?? "",
    notifications: {
      notifyDigest: profile?.notify_digest ?? true,
      notifyDmAlerts: profile?.notify_dm_alerts ?? true,
    },
    mySailings,
    hasUnreadMessages: unreadCount > 0,
    unreadCount,
    markChatSeen,
    nameMode: profile?.name_mode ?? "anon",
    nickname: profile?.nickname ?? "",
    myDisplayName,
    refreshUserData: loadUserData,
    completeSignUp,
    logIn,
    joinSailing,
    updateSailingProfile,
    removeSailing,
    updateAccount,
    updateAvatar,
    updatePassword,
    updateNotificationSettings,
    signOut,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
