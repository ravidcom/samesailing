"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
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
      }

      // AuthProvider's own auth-state listener may have already loaded
      // mySailings/profile for this session — possibly before the insert
      // above committed, caching it as stale until some later auth event
      // (e.g. a token refresh, which can be a long time away) happens to
      // reload it. Refresh explicitly here so downstream pages see it now.
      await refreshUserData(user.id);

      // Route through the onboarding wizard for a specific sailing rather
      // than joining it directly here — a returning user still needs to be
      // asked their party type/country/goals *for this sailing* (that's
      // per-sailing data, not part of their account), the same as a
      // brand-new signup already was. Joining with a blank profile would
      // leave them invisible on the passenger board (which filters out
      // sailings with no profile) and unable to be matched with anyone.
      router.push(joinId ? `/join/${joinId}` : "/dashboard");
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
