"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { getSailingByIdAction } from "@/lib/cruiseActions";
import { useAuth } from "@/lib/auth-context";

function deriveName(metadata: Record<string, unknown> | undefined, email: string | null | undefined) {
  const name = (metadata?.full_name || metadata?.name || metadata?.preferred_username) as
    | string
    | undefined;
  if (name?.trim()) return name.trim();
  if (email) return email.split("@")[0];
  return "Traveler";
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUserData } = useAuth();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const supabase = createClient();
      const code = searchParams.get("code");
      const joinId = searchParams.get("join");

      if (!code) {
        setError("Missing sign-in code. Please try again.");
        return;
      }

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !data.session) {
        setError(exchangeError?.message || "Sign-in failed. Please try again.");
        return;
      }

      const user = data.session.user;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").insert({
          id: user.id,
          name: deriveName(user.user_metadata, user.email),
          country: "",
          avatar: "😊",
        });
        router.push(joinId ? `/join/${joinId}` : "/join");
        return;
      }

      if (joinId) {
        const sailing = await getSailingByIdAction(joinId);
        if (sailing) {
          await supabase.from("joined_sailings").upsert(
            {
              user_id: user.id,
              sailing_id: sailing.id,
              line: sailing.line,
              ship_name: sailing.shipName,
              sail_date: sailing.date,
              itinerary: sailing.itinerary,
              port: sailing.port,
              profile: null,
            },
            { onConflict: "user_id,sailing_id", ignoreDuplicates: true }
          );
        }
      }
      // AuthProvider's own auth-state listener may have already loaded
      // mySailings for this session — possibly before the upsert above
      // committed, caching it as empty until some later auth event (e.g. a
      // token refresh, which can be a long time away) happens to reload it.
      // Refresh explicitly here so the dashboard shows the join immediately.
      await refreshUserData(user.id);
      router.push("/dashboard");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16 text-center">
        <div className="w-full max-w-[420px]">
          <h1 className="mb-3 font-display text-2xl font-bold text-charcoal">
            Sign-in didn&apos;t go through
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted">{error}</p>
          <a
            href="/login"
            className="inline-block rounded-xl bg-teal px-6 py-3 font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Back to sign in →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-muted-2">
      Signing you in…
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <>
      <NavBar />
      <Suspense fallback={null}>
        <CallbackHandler />
      </Suspense>
    </>
  );
}
