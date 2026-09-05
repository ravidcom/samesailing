"use client";

import type { Badge } from "@/lib/pioneer";

/** Top-right corner ribbon for a passenger card. Parent must be
 * `position:relative; overflow:hidden` for the border radius to clip it. */
export function CornerRibbon({
  badge,
  onToggle,
}: {
  badge: Badge;
  onToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={badge.tip}
      className="absolute top-0 right-0 flex items-center gap-1 rounded-bl-[11px] px-[11px] py-1 text-[10.5px] font-extrabold tracking-[.07em] whitespace-nowrap uppercase"
      style={{ background: badge.ribbonBg, color: badge.ribbonFg }}
    >
      {badge.ribbonLabel}
      <span className="text-[11px] font-bold tracking-normal normal-case opacity-[.72]">ⓘ</span>
    </button>
  );
}

/** Always rendered, toggled via `display` rather than conditional mounting
 * so it behaves inside list-rendered cards. */
export function BadgeExplainer({ badge, show }: { badge: Badge; show: boolean }) {
  return (
    <div
      style={{
        display: show ? "block" : "none",
        background: badge.tipBg,
        border: `1px solid ${badge.tipBorder}`,
      }}
      className="mt-3 rounded-[10px] px-3 py-2.5 text-[13px] leading-[1.5] text-[#5a5048]"
    >
      {badge.tip}
    </div>
  );
}

/** Compact inline pill for a sender name in group chat / a DM header. */
export function CompactBadge({ badge }: { badge: Badge }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[.04em] whitespace-nowrap uppercase"
      style={{ background: badge.ribbonBg, color: badge.ribbonFg }}
    >
      {badge.ribbonLabel}
    </span>
  );
}
