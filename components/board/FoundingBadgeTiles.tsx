"use client";

import { useState } from "react";
import { FOUNDING_TILES } from "@/lib/pioneer";

/** The four badge tiles in the founding-member card, tappable to reveal a
 * one-line explainer. 4-up on wide layouts, 2x2 (medal beside the label) on
 * narrow ones - a 4-up row at mobile widths pushes the caption under
 * legible size. */
export default function FoundingBadgeTiles() {
  const [openTier, setOpenTier] = useState<string | null>(null);
  const open = FOUNDING_TILES.find((t) => t.tier === openTier) ?? null;

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-[9px]">
        {FOUNDING_TILES.map((t) => (
          <button
            key={t.tier}
            type="button"
            onClick={() => setOpenTier((cur) => (cur === t.tier ? null : t.tier))}
            style={{ background: t.gradient, borderColor: t.ringColor }}
            className="flex items-center gap-2.5 rounded-[13px] border-[1.5px] p-[10px_11px] text-left sm:flex-col sm:gap-1.75 sm:p-[13px_8px_11px] sm:text-center"
          >
            <span
              style={{ boxShadow: `0 0 0 2px ${t.ringColor}` }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[17px] sm:h-[38px] sm:w-[38px] sm:text-[20px]"
            >
              {t.emoji}
            </span>
            <span className="min-w-0">
              <span style={{ color: t.labelColor }} className="block text-[13px] leading-[1.2] font-extrabold sm:text-[12.5px]">
                {t.label}
              </span>
              <span
                style={{ color: t.labelColor }}
                className="mt-0.5 block text-[9.5px] font-extrabold tracking-[.07em] uppercase sm:text-[10.5px]"
              >
                {t.caption}
              </span>
            </span>
          </button>
        ))}
      </div>
      {open ? (
        <div className="mt-2.5 text-[12.5px] leading-relaxed text-muted">{open.tip}</div>
      ) : null}
    </div>
  );
}
