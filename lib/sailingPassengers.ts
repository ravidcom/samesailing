import { unstable_cache } from "next/cache";
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

/**
 * Cached wrapper around the get_sailing_passengers() RPC. This data is
 * anonymous and public (createServerClient() carries no cookies/session),
 * so a short cache window is safe - it's what keeps a burst of visitors to
 * the same sailing off Supabase's connection pool instead of each one
 * taking a connection, at the cost of the passenger list/count lagging by
 * up to `revalidate` seconds. Route-segment `export const revalidate`
 * doesn't help here since it only patches native `fetch()` calls, and
 * supabase-js's internal HTTP client isn't reachable that way - confirmed
 * empirically (the route's build-output classification didn't change) -
 * unstable_cache wraps the async function directly instead, independent
 * of what HTTP client it uses.
 */
export const getCachedSailingPassengers = unstable_cache(
  async (sailingId: string): Promise<SailingPassengerRow[]> => {
    const supabase = createServerClient();
    const { data } = await supabase.rpc("get_sailing_passengers", { p_sailing_id: sailingId });
    return (data as SailingPassengerRow[] | null) ?? [];
  },
  ["sailing-passengers"],
  { revalidate: 30 }
);

export type PublicProfileRow = {
  id: string;
  name: string | null;
  name_mode: string | null;
  nickname: string | null;
  avatar: string | null;
  avatar_tint: string | null;
};

/** Display-name/avatar lookup for a sailing's passengers - cached under the
 * same key/window as getCachedSailingPassengers() since it's always
 * derived from that same (already-cached) passenger list, so the two stay
 * consistent within one cache window. */
export const getCachedSailingPassengerNames = unstable_cache(
  async (sailingId: string, userIds: string[]): Promise<PublicProfileRow[]> => {
    if (userIds.length === 0) return [];
    const supabase = createServerClient();
    const { data } = await supabase
      .from("public_profiles")
      .select("id,name,name_mode,nickname,avatar,avatar_tint")
      .in("id", userIds);
    return data ?? [];
  },
  ["sailing-passenger-names"],
  { revalidate: 30 }
);
