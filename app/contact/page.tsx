"use client";

import { useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fieldLabel, textInput, primaryButton, errorText } from "@/lib/formStyles";

export default function ContactPage() {
  const supabase = useMemo(() => createClient(), []);
  const { loading, user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Fill name/email from the signed-in user once auth finishes loading (render-time
  // sync, not an effect — `user` can be non-null with a "Traveler" placeholder name
  // before the profile row itself has loaded, so wait for `loading` to clear).
  if (!loading && !prefilled) {
    setPrefilled(true);
    if (user) {
      setName((n) => n || user.name);
      setEmail((e) => e || (user.email !== "-" ? user.email : ""));
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { error: insertError } = await supabase
      .from("contact_messages")
      .insert({ name: name.trim(), email: email.trim(), message: message.trim() });
    setSubmitting(false);
    if (insertError) {
      setError("Something went wrong sending your message. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-[560px] px-4 pb-16 pt-[100px]">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.04em] text-teal">
          Get in touch
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold text-charcoal">Contact us</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted">
          Questions, feedback, or something that doesn&apos;t feel right on a
          sailing? Send us a message and we&apos;ll get back to you.
        </p>

        {sent ? (
          <div className="rounded-[16px] border-[1.5px] border-[#b9e5e8] bg-teal-tint px-6 py-8 text-center">
            <div className="mb-2 text-2xl">✓</div>
            <div className="mb-1 font-display text-lg font-bold text-charcoal">
              Message sent
            </div>
            <p className="text-sm text-muted">
              Thanks for reaching out — we&apos;ll be in touch soon.
            </p>
          </div>
        ) : (
          <div className="rounded-[22px] border-[1.5px] border-border bg-white p-6">
            <label htmlFor="contact-name" className={fieldLabel}>
              Your name
            </label>
            <input id="contact-name" className={textInput} value={name} onChange={(e) => setName(e.target.value)} />

            <label htmlFor="contact-email" className={fieldLabel + " mt-4"}>
              Email
            </label>
            <input
              id="contact-email"
              className={textInput}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="contact-message" className={fieldLabel + " mt-4"}>
              Message
            </label>
            <textarea
              id="contact-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-none rounded-[11px] border-[1.5px] border-border bg-input px-[13px] py-3 font-sans text-sm text-charcoal transition-colors focus:border-teal"
            />

            {error ? <div className={errorText}>{error}</div> : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={primaryButton + (submitting ? " cursor-not-allowed opacity-70" : "")}
            >
              {submitting ? "Sending…" : "Send message →"}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
