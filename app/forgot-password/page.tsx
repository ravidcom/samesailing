"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { fieldLabel, textInput, primaryButton, backLink, errorText } from "@/lib/formStyles";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
          <div className="border-b border-border bg-input px-[30px] pb-[22px] pt-6">
            <div className="mb-1 text-xs font-semibold tracking-[.04em] text-teal">Reset password</div>
            <div className="font-display text-[22px] font-bold text-charcoal">We&apos;ll send you a link</div>
          </div>
          <div className="px-[30px] pb-[30px] pt-[26px]">
            {sent ? (
              <div className="text-sm leading-relaxed text-muted">
                If an account exists for <strong className="text-charcoal">{email}</strong>, a reset
                link has been sent. Follow it to set a new password.
              </div>
            ) : (
              <>
                <div className="mb-5 text-[13px] leading-relaxed text-muted">
                  Enter the email address you registered with and we&apos;ll send a
                  reset link within a few minutes.
                </div>
                <label className={fieldLabel}>Email address</label>
                <input
                  className={textInput}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error ? <div className={errorText}>{error}</div> : null}

                <button
                  type="button"
                  className={primaryButton + (submitting ? " cursor-not-allowed opacity-70" : "")}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send reset link →"}
                </button>
                <button type="button" className={backLink} onClick={() => router.push("/login")}>
                  ← Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
