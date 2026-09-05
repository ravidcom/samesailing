import { FOUNDING_TILES } from "@/lib/pioneer";

/** The four founding-perk badges as one compact row - what the perks
 * paragraph right above already explains in prose, so these are purely
 * visual, not another set of tappable explainers. */
export default function FoundingBadgeChips() {
  return (
    <div className="flex gap-1.75">
      {FOUNDING_TILES.map((t) => (
        <div
          key={t.tier}
          style={{ background: t.gradient, borderColor: t.ringColor }}
          className="flex flex-1 flex-col items-center rounded-[11px] border-[1.5px] px-1 py-2.25 text-center"
        >
          <span className="text-[19px] leading-[1.2]">{t.emoji}</span>
          <span style={{ color: t.labelColor }} className="mt-0.5 text-[11.5px] font-extrabold">
            {t.label}
          </span>
          <span style={{ color: t.labelColor }} className="text-[9px] font-extrabold tracking-[.06em]">
            {t.caption}
          </span>
        </div>
      ))}
    </div>
  );
}
