"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";
import { fieldLabel, selectInput, primaryButton } from "@/lib/formStyles";

const REASONS = ["Harassment or abuse", "Inappropriate content", "Spam or scam", "Fake profile", "Other"];

const NOTE_MAX_LENGTH = 300;

export type ReportMessageContext = {
  id: string;
  kind: "group_message" | "dm_message";
  preview: string;
};

export type ReportTarget = {
  userId: string;
  label: string;
  sailingId?: string | null;
  message?: ReportMessageContext | null;
};

export default function ReportModal({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function reset() {
    setReason(REASONS[0]);
    setNote("");
    setSent(false);
  }

  function handleClose() {
    onClose();
    // Wait out the close so the form doesn't visibly reset before it's hidden.
    setTimeout(reset, 200);
  }

  async function submit() {
    if (!target) return;
    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: target.userId,
      sailing_id: target.sailingId ?? null,
      message_kind: target.message?.kind ?? null,
      message_id: target.message?.id ?? null,
      message_preview: target.message?.preview ?? null,
      reason,
      note: note.trim() || null,
    });
    setSubmitting(false);
    setSent(true);
  }

  return (
    <Modal open={!!target} onClose={handleClose}>
      {sent ? (
        <div className="py-2 text-center">
          <div className="mb-2 text-2xl">✓</div>
          <div className="mb-1 font-display text-lg font-bold text-charcoal">Report sent</div>
          <p className="mb-5 text-sm text-muted">Thanks for flagging this - we&apos;ll take a look.</p>
          <button type="button" onClick={handleClose} className={primaryButton + " mt-0"}>
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="mb-1 font-display text-lg font-bold text-charcoal">Report {target?.label}</div>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Sent privately to the SameSailing team - {target?.label} won&apos;t be notified.
          </p>

          <label className={fieldLabel}>Reason</label>
          <select className={selectInput} value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <label className={fieldLabel + " mt-3"}>Details (optional)</label>
          <textarea
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-none rounded-[11px] border-[1.5px] border-border bg-input px-[13px] py-3 font-sans text-sm text-charcoal transition-colors focus:border-teal"
          />
          <div className="mt-1 text-right text-[11px] text-muted-2">
            {note.length}/{NOTE_MAX_LENGTH}
          </div>

          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-[11px] border-[1.5px] border-border py-3 font-sans text-sm font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="flex-1 rounded-[11px] border-none bg-coral py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#d9482e] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Sending…" : "Submit report"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
