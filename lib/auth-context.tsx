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
};

type NotificationSettings = { notifyDigest: boolean; notifyDmAlerts: boolean };

type AuthContextValue = {
  loading: boolean;
  loggedIn: boolean;
  userId: string | null;
  user: AuthUser | null;
  country: string;
  notifications: NotificationSettings;
  mySailings: JoinedSailing[];
  completeSignUp: (input: SignUpInput) => Promise<{ error?: string }>;
  logIn: (email: string, password: string) => Promise<{ error?: string }>;
  joinSailing: (sailing: JoinedSailing) => Promise<{ error?: string }>;
  updateSailingProfile: (sailingId: string, profile: OnboardingProfile) => Promise<{ error?: string }>;
  removeSailing: (sailingId: string) => Promise<void>;
  updateAccount: (patch: { name?: string; country?: string }) => Promise<void>;
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
};
type JoinedSailingRow = {
  sailing_id: string;
  line: string;
  ship_name: string;
  sail_date: string;
  itinerary: string;
  port: string;
  profile: OnboardingProfile | null;
};

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

  async function loadUserData(userId: string) {
    const [{ data: profileRow }, { data: sailingRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,name,country,avatar,notify_digest,notify_dm_alerts")
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
      }
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeSignUp({ name, email, password, avatar, country, sailing }: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user || !data.session) {
      return {
        error:
          "Account created — check your email to confirm it before signing in.",
      };
    }

    const userId = data.user.id;
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: userId, name, country, avatar });
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

  async function updateAccount(patch: { name?: string; country?: string }) {
    if (!authUser) return;
    const { data } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", authUser.id)
      .select("id,name,country,avatar,notify_digest,notify_dm_alerts")
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
      .select("id,name,country,avatar,notify_digest,notify_dm_alerts")
      .maybeSingle();
    if (data) setProfile(data);
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
    country: profile?.country ?? "",
    notifications: {
      notifyDigest: profile?.notify_digest ?? true,
      notifyDmAlerts: profile?.notify_dm_alerts ?? true,
    },
    mySailings,
    completeSignUp,
    logIn,
    joinSailing,
    updateSailingProfile,
    removeSailing,
    updateAccount,
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
