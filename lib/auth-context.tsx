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
};

export type AuthUser = { name: string; email: string; avatar: string };

type SignUpInput = {
  name: string;
  email: string;
  password: string;
  avatar: string;
  country: string;
  sailing: JoinedSailing | null;
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
  country: string;
  notifications: NotificationSettings;
  mySailings: JoinedSailing[];
  hasUnreadMessages: boolean;
  unreadCount: number;
  markChatSeen: () => void;
  profileModalOpen: boolean;
  showProfileModal: (open: boolean) => void;
  nameMode: NameMode;
  nickname: string;
  /** Resolves what I'm labelled as for a given (per-sailing) party type — the handle noun differs by party type, so this needs to know which sailing's context it's being shown in. */
  myDisplayName: (partyType: PartyType | null) => { name: string; anon: boolean };
  refreshUserData: (userId: string) => Promise<void>;
  completeSignUp: (input: SignUpInput) => Promise<{ error?: string }>;
  logIn: (email: string, password: string) => Promise<{ error?: string }>;
  joinSailing: (sailing: JoinedSailing) => Promise<{ error?: string }>;
  updateSailingProfile: (sailingId: string, profile: OnboardingProfile) => Promise<{ error?: string }>;
  removeSailing: (sailingId: string) => Promise<void>;
  updateAccount: (patch: { nameMode?: NameMode; nickname?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileRow = {
  id: string;
  name: string;
  country: string;
  avatar: string;
  notify_digest: boolean;
  notify_dm_alerts: boolean;
  name_mode: NameMode;
  nickname: string;
};

const PROFILE_COLUMNS = "id,name,country,avatar,notify_digest,notify_dm_alerts,name_mode,nickname";
type JoinedSailingRow = {
  sailing_id: string;
  line: string;
  ship_name: string;
  sail_date: string;
  itinerary: string;
  port: string;
  profile: OnboardingProfile | null;
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
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [mySailings, setMySailings] = useState<JoinedSailing[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  async function loadUserData(userId: string) {
    const [{ data: profileRow }, { data: sailingRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("joined_sailings")
        .select("sailing_id,line,ship_name,sail_date,itinerary,port,profile")
        .eq("user_id", userId),
    ]);
    setProfile(profileRow ?? null);
    setMySailings((sailingRows ?? []).map(rowToSailing));
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
        setProfileModalOpen(false);
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

  // Named action (not a raw setter) so effects that call it from other
  // components — e.g. DashboardContent syncing ?edit=1 — aren't flagged by
  // the set-state-in-effect lint rule, which pattern-matches on setX() calls
  // written directly in an effect body.
  function showProfileModal(open: boolean) {
    setProfileModalOpen(open);
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
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name,
      country,
      avatar,
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

  async function joinSailing(sailing: JoinedSailing) {
    if (!authUser) return { error: "You need to be signed in to join a sailing." };
    // Re-joining a sailing already on the account (e.g. clicking an old
    // join link again) is an update, not a new addition — don't count it
    // against the per-ship/total limits.
    const alreadyJoined = mySailings.some((s) => s.id === sailing.id);
    if (!alreadyJoined) {
      const sameShipCount = mySailings.filter((s) => s.shipName === sailing.shipName).length;
      if (sameShipCount >= 2) {
        return { error: `You've already joined 2 sailings on ${sailing.shipName} — that's the limit per ship.` };
      }
      if (mySailings.length >= 5) {
        return { error: "You've reached the limit of 5 joined sailings. Leave one to add another." };
      }
    }
    const { error } = await supabase.from("joined_sailings").upsert(
      {
        user_id: authUser.id,
        sailing_id: sailing.id,
        line: sailing.line,
        ship_name: sailing.shipName,
        sail_date: sailing.date,
        itinerary: sailing.itinerary,
        port: sailing.port,
        profile: sailing.profile,
      },
      { onConflict: "user_id,sailing_id" }
    );
    if (error) return { error: error.message };
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

  const value: AuthContextValue = {
    loading,
    loggedIn: !!authUser,
    userId: authUser?.id ?? null,
    user: authUser
      ? { name: profile?.name ?? "Traveler", email: authUser.email ?? "-", avatar: profile?.avatar ?? "😊" }
      : null,
    hasPassword: authUser?.app_metadata?.provider === "email",
    country: profile?.country ?? "",
    notifications: {
      notifyDigest: profile?.notify_digest ?? true,
      notifyDmAlerts: profile?.notify_dm_alerts ?? true,
    },
    mySailings,
    hasUnreadMessages: unreadCount > 0,
    unreadCount,
    markChatSeen,
    profileModalOpen,
    showProfileModal,
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
    updatePassword,
    updateNotificationSettings,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
