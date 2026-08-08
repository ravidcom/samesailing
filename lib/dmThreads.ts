import type { SupabaseClient } from "@supabase/supabase-js";

/** dm_threads always stores the pair as (user_a < user_b) so it maps 1:1 regardless of who started it. */
export function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function findOrCreateThread(
  supabase: SupabaseClient,
  sailingId: string,
  me: string,
  other: string
): Promise<string> {
  const [user_a, user_b] = sortedPair(me, other);

  const { data: existing } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("sailing_id", sailingId)
    .eq("user_a", user_a)
    .eq("user_b", user_b)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("dm_threads")
    .insert({ sailing_id: sailingId, user_a, user_b })
    .select("id")
    .single();
  if (created) return created.id;

  // Lost a race with the other participant creating it first — fetch theirs.
  const { data: retry } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("sailing_id", sailingId)
    .eq("user_a", user_a)
    .eq("user_b", user_b)
    .maybeSingle();
  if (retry) return retry.id;

  throw error ?? new Error("Couldn't start conversation.");
}
