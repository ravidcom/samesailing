"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/client";
import { fieldLabel, textInput, primaryButton, errorText } from "@/lib/formStyles";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
          <div className="border-b border-border bg-input px-[30px] pb-[22px] pt-6">
            <div className="mb-1 text-xs font-semibold tracking-[.04em] text-teal">Reset password</div>
            <div className="font-display text-[22px] font-bold text-charcoal">Choose a new password</div>
          </div>
          <div className="px-[30px] pb-[30px] pt-[26px]">
            <label htmlFor="reset-password-new" className={fieldLabel}>
              New password
            </label>
            <input
              id="reset-password-new"
              className={textInput}
              type="password"
              placeholder="At least 8 characters"
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
              {submitting ? "Updating…" : "Update password →"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
