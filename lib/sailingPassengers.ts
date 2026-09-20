import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import type { OnboardingProfile } from "@/lib/auth-context";

/** Return shape of the get_sailing_passengers() RPC - supabase-js can't
 * infer this on its own since the client isn't given a generated Database
 * type. */
export type SailingPassengerRow = {
  user_id: string;
  profile: OnboardingProfile | null;
  join_rank: number | null;
  joined_at: string;
};

export type PublicProfileRow = {
  id: string;
  name: string | null;
  name_mode: string | null;
  nickname: string | null;
  avatar: string | null;
  avatar_tint: string | null;
};

type PublicSummaryRow = {
  member_count: number;
  user_id: string | null;
  avatar: string | null;
  avatar_tint: string | null;
};

/**
 * What an anonymous visitor may know about a sailing: how many travelers
 * have joined, plus the emoji avatars of the first three (the social-proof
 * stack on /sailing/[id]). Nothing else - see get_sailing_public_summary()
 * in supabase/schema.sql. Cached briefly so a burst of visitors to one
 * sailing doesn't each take a database connection; this is public data,
 * so unlike anything member-only it is safe to cache.
 */
const getCachedPublicSummary = unstable_cache(
  async (sailingId: string): Promise<PublicSummaryRow[]> => {
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc("get_sailing_public_summary", { p_sailing_id: sailingId });
    // Throw rather than return []: a thrown result is never cached, whereas
    // an empty list would be stored for the whole revalidate window and
    // read as "0 travelers".
    if (error) throw new Error(error.message);
    return (data as PublicSummaryRow[] | null) ?? [];
  },
  ["sailing-public-summary"],
  { revalidate: 30 }
);

/** null means the lookup failed (not "zero members"), so callers can hide
 * the number instead of showing a wrong 0. */
async function loadPublicSummary(sailingId: string): Promise<PublicSummaryRow[] | null> {
  try {
    return await getCachedPublicSummary(sailingId);
  } catch {
    return null;
  }
}

/** Traveler count, or null if it couldn't be fetched. */
export async function getSailingMemberCount(sailingId: string): Promise<number | null> {
  const rows = await loadPublicSummary(sailingId);
  if (!rows) return null;
  return rows[0]?.member_count ?? 0;
}

/**
 * Public-safe stand-in for the old anonymous passenger list, kept so
 * /sailing/[id] (which must not change) still gets the same shape: `length`
 * is the traveler count and the first three rows carry real user ids for
 * the avatar lookup below. Every profile is null and every row past the
 * first three is an empty placeholder - no member data beyond that.
 */
export async function getCachedSailingPassengers(sailingId: string): Promise<SailingPassengerRow[]> {
  const rows = (await loadPublicSummary(sailingId)) ?? [];
  const count = rows[0]?.member_count ?? 0;
  return Array.from({ length: count }, (_, i) => ({
    user_id: rows[i]?.user_id ?? "",
    profile: null,
    join_rank: null,
    joined_at: "",
  }));
}

/** Avatar-only lookup for the public sailing page's social-proof stack.
 * Names/nicknames are deliberately never returned to anonymous callers. */
export async function getCachedSailingPassengerNames(
  sailingId: string,
  userIds: string[]
): Promise<PublicProfileRow[]> {
  const rows = (await loadPublicSummary(sailingId)) ?? [];
  return rows
    .filter((r) => r.user_id && userIds.includes(r.user_id))
    .map((r) => ({
      id: r.user_id as string,
      name: null,
      name_mode: null,
      nickname: null,
      avatar: r.avatar,
      avatar_tint: r.avatar_tint,
    }));
}

/** True for a joined member of the sailing, or an admin (existing
 * moderation access). `supabase` must be the caller's own client (see
 * getVerifiedRequestUser) so this reads only rows RLS lets them see. */
export async function canViewSailingMembers(
  supabase: SupabaseClient,
  userId: string,
  sailingId: string
): Promise<boolean> {
  const [{ data: joined }, { data: moderation }] = await Promise.all([
    supabase
      .from("joined_sailings")
      .select("sailing_id")
      .eq("user_id", userId)
      .eq("sailing_id", sailingId)
      .maybeSingle(),
    supabase.from("user_moderation").select("is_admin,banned").eq("user_id", userId).maybeSingle(),
  ]);
  if (moderation?.banned) return false;
  return !!joined || !!moderation?.is_admin;
}

/** Full passenger rows + display names for one sailing. Member/admin only -
 * callers must check canViewSailingMembers() first, and the database
 * enforces the same rule inside get_sailing_passengers(). Never cached:
 * the result is per-viewer authorised data. */
export async function getMemberPassengerData(
  supabase: SupabaseClient,
  sailingId: string
): Promise<{ rows: SailingPassengerRow[]; names: PublicProfileRow[] }> {
  const { data } = await supabase.rpc("get_sailing_passengers", { p_sailing_id: sailingId });
  const rows = (data as SailingPassengerRow[] | null) ?? [];
  const ids = rows.filter((r) => r.profile).map((r) => r.user_id);
  if (ids.length === 0) return { rows, names: [] };
  const { data: names } = await supabase
    .from("public_profiles")
    .select("id,name,name_mode,nickname,avatar,avatar_tint")
    .in("id", ids);
  return { rows, names: names ?? [] };
}
