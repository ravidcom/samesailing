"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Live count of real joined_sailings rows for a sailing (includes the caller, if joined). */
export function useTravelerCount(sailingId: string | null, fallback = 1) {
  const [result, setResult] = useState<{ id: string; count: number } | null>(null);

  useEffect(() => {
    if (!sailingId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("joined_sailings")
      .select("user_id", { count: "exact", head: true })
      .eq("sailing_id", sailingId)
      .then(({ count: n }) => {
        if (!cancelled) setResult({ id: sailingId, count: n ?? 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [sailingId]);

  if (!sailingId || result?.id !== sailingId) return fallback;
  return result.count;
}
