"use client";

import { useState } from "react";
import { usePwaInstall } from "@/lib/pwaInstall";
import Modal from "./Modal";

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E8C99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <rect x="5" y="10" width="14" height="11" rx="2" />
    </svg>
  );
}

export default function InstallAppButton({ compact }: { compact?: boolean }) {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  // Nothing to offer once installed, and nothing to do on a browser that
  // never signalled installability and isn't iOS (no manual fallback exists
  // there either, e.g. desktop Firefox) - hiding beats a dead button.
  if (isStandalone || (!isIOS && !canInstall)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (isIOS ? setShowIOSHelp(true) : promptInstall())}
        className={
          compact
            ? "inline-flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
            : "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border px-4 py-2 font-sans text-sm font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
        }
      >
        {compact ? "📲 Install" : "📲 Install app"}
      </button>

      <Modal open={showIOSHelp} onClose={() => setShowIOSHelp(false)}>
        <div className="mb-1 font-display text-lg font-bold text-charcoal">Install SameSailing</div>
        <p className="mb-5 text-sm leading-relaxed text-muted">
          Safari on iPhone/iPad doesn&apos;t support one-tap install - here&apos;s the manual way, it only takes a few seconds:
        </p>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-tint text-sm font-bold text-teal">
              1
            </span>
            <div className="flex items-center gap-2 text-sm text-charcoal">
              Tap the Share button <ShareIcon /> in Safari&apos;s toolbar
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-tint text-sm font-bold text-teal">
              2
            </span>
            <div className="text-sm text-charcoal">
              Scroll down and tap <strong className="font-semibold">Add to Home Screen</strong>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-tint text-sm font-bold text-teal">
              3
            </span>
            <div className="text-sm text-charcoal">
              Tap <strong className="font-semibold">Add</strong> in the top right to confirm
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowIOSHelp(false)}
          className="mt-6 w-full rounded-[11px] border-none bg-teal py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          Got it
        </button>
      </Modal>
    </>
  );
}
