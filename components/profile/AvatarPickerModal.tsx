"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { AV_PEOPLE, AV_CREATURES, AV_SEA, AV_TINTS } from "@/lib/avatars";

const AV_ALL = [...AV_PEOPLE, ...AV_CREATURES, ...AV_SEA];
const GROUPS: { label: string; items: string[] }[] = [
  { label: "PEOPLE", items: AV_PEOPLE },
  { label: "CREATURES", items: AV_CREATURES },
  { label: "AT SEA", items: AV_SEA },
];

/**
 * Rendered only while open (the caller conditionally mounts it) - that's
 * what makes Cancel/close "restore the snapshot" for free: pendingEmoji/
 * pendingTint are local state seeded from currentEmoji/currentTint on
 * mount, nothing outside this component is touched until Save, and
 * unmounting on cancel just discards that local state along with it.
 */
export default function AvatarPickerModal({
  currentEmoji,
  currentTint,
  displayName,
  onCancel,
  onSave,
}: {
  currentEmoji: string;
  currentTint: string;
  displayName: string;
  onCancel: () => void;
  onSave: (emoji: string, tint: string) => void;
}) {
  const [pendingEmoji, setPendingEmoji] = useState(currentEmoji);
  const [pendingTint, setPendingTint] = useState(currentTint);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function surpriseMe() {
    const tintKeys = Object.keys(AV_TINTS);
    setPendingEmoji(AV_ALL[Math.floor(Math.random() * AV_ALL.length)]);
    setPendingTint(tintKeys[Math.floor(Math.random() * tintKeys.length)]);
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onClick={(e) => {
        // Clicks inside the panel must not close it - only a genuine
        // backdrop click (target is this wrapper itself) does.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Choose your avatar"
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-white outline-none md:max-h-[calc(100dvh-40px)] md:max-w-[520px] md:rounded-[22px]"
        style={{ animation: "ccPop .2s ease" }}
      >
        <div className="mx-auto mt-2.5 h-1 w-[38px] shrink-0 rounded-full bg-border md:hidden" />

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#eaf3f4] px-6 py-[18px]">
          <div>
            <div className="mb-0.5 font-display text-[19px] font-bold text-charcoal">Choose your avatar</div>
            <div className="text-[13px] text-muted">Pick a look and a background color.</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#e2f0f1] text-muted transition-colors hover:border-teal hover:text-teal"
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-4 border-b border-[#eaf3f4] px-6 py-[18px]">
          <div className="shrink-0 rounded-full" style={{ boxShadow: "0 0 0 3px #fff, 0 0 0 4.5px #0E8C99" }}>
            <Avatar emoji={pendingEmoji} tint={pendingTint} size={70} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="truncate text-sm font-bold text-charcoal">{displayName}</div>
            <button
              type="button"
              onClick={surpriseMe}
              className="self-start rounded-full border-[1.5px] border-border bg-white px-3.5 py-1.5 font-sans text-[12.5px] font-semibold whitespace-nowrap text-teal transition-colors hover:border-teal hover:bg-teal-tint"
            >
              ↻ Surprise me
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-[18px]">
          {GROUPS.map((group) => (
            <div key={group.label} className="mt-[18px] first:mt-0">
              <div className="mb-2 text-[11px] font-semibold tracking-[.07em] text-muted-2 uppercase">{group.label}</div>
              <div className="grid grid-cols-6 gap-2 md:grid-cols-8 md:gap-[7px]">
                {group.items.map((em) => {
                  const selected = em === pendingEmoji;
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setPendingEmoji(em)}
                      aria-label={em}
                      className="flex aspect-square items-center justify-center rounded-xl border-[1.5px] text-[22px] transition-all hover:border-teal md:rounded-[11px] md:text-[19px]"
                      style={{
                        background: selected ? AV_TINTS[pendingTint] : "#f6fbfb",
                        borderColor: selected ? "#0E8C99" : "#e2f0f1",
                      }}
                    >
                      {em}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-[18px] text-[11px] font-semibold tracking-[.07em] text-muted-2 uppercase">Background</div>
          <div className="mt-2 flex flex-wrap gap-[9px]">
            {Object.entries(AV_TINTS).map(([key, hex]) => {
              const selected = key === pendingTint;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPendingTint(key)}
                  aria-label={`${key} background`}
                  className="h-9 w-9 rounded-full"
                  style={{
                    background: hex,
                    boxShadow: selected ? "0 0 0 2px #fff, 0 0 0 4px #0E8C99" : "0 0 0 1.5px #d8ebec",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 gap-2.5 border-t border-[#eaf3f4] bg-[#fbfdfd] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[11px] border-[1.5px] border-border py-3 font-sans text-sm font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(pendingEmoji, pendingTint)}
            className="flex-[1.6] rounded-[11px] border-none bg-teal py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Save avatar
          </button>
        </div>
      </div>
    </div>
  );
}
