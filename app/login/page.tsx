"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getSailingByIdAction } from "@/lib/cruiseActions";
import { fieldLabel, textInput, primaryButton, backLink, errorText, socialButton } from "@/lib/formStyles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const joinId = searchParams.get("join");

  async function afterLogin() {
    if (joinId) {
      const sailing = await getSailingByIdAction(joinId);
      if (sailing) {
        await auth.joinSailing({
          id: sailing.id,
          line: sailing.line,
          shipName: sailing.shipName,
          date: sailing.date,
          itinerary: sailing.itinerary,
          port: sailing.port,
          profile: null,
        });
      }
    }
    router.push("/dashboard");
  }

  async function handleSubmit() {
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await auth.logIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    await afterLogin();
  }

  async function socialAuth(provider: "google" | "facebook") {
    setError("");
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (joinId) redirectTo.searchParams.set("join", joinId);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
      <div className="border-b border-border bg-input px-[30px] pb-[22px] pt-6">
        <div className="mb-1 text-xs font-semibold tracking-[.04em] text-teal">Welcome back</div>
        <div className="font-display text-[22px] font-bold text-charcoal">Sign in to SameSailing.com</div>
      </div>
      <div className="px-[30px] pb-[30px] pt-[26px]">
        <button type="button" className={socialButton} onClick={() => socialAuth("google")}>
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
        <button type="button" className={socialButton} onClick={() => socialAuth("facebook")}>
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#1877F2" />
            <path d="M16.5 8H14.5C13.95 8 13.5 8.45 13.5 9V11H16.5L16 14H13.5V22H10.5V14H8.5V11H10.5V9C10.5 6.79 12.29 5 14.5 5H16.5V8Z" fill="white" />
          </svg>
          Continue with Facebook
        </button>

        <div className="my-[18px] flex items-center gap-2.5">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] tracking-[.1em] text-muted-2 uppercase">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <label htmlFor="login-email" className={fieldLabel}>
          Email
        </label>
        <input
          id="login-email"
          className={textInput}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="login-password" className={fieldLabel + " mt-4"}>
          Password
        </label>
        <input
          id="login-password"
          className={textInput}
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <div className={errorText}>{error}</div> : null}

        <button
          type="button"
          className={primaryButton + (submitting ? " cursor-not-allowed opacity-70" : "")}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in →"}
        </button>
        <button type="button" className={backLink} onClick={() => router.push("/")}>
          ← Back
        </button>

        <div className="mt-[18px] text-center text-[13px] text-muted-2">
          Don&apos;t have an account?{" "}
          <Link href={joinId ? `/join/${joinId}` : "/join"} className="font-semibold text-teal">
            Join free →
          </Link>
        </div>
        <div className="mt-2.5 text-center">
          <Link href="/forgot-password" className="text-xs text-muted-2 underline underline-offset-4">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
