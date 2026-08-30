import { AV_TINTS, DEFAULT_AVATAR_EMOJI, DEFAULT_AVATAR_TINT } from "@/lib/avatars";

/** The one place that renders a chosen avatar (emoji + tint) - every other
 * spot in the app should go through this instead of re-deriving the
 * background color or falling back to a hardcoded emoji on its own. */
export default function Avatar({
  emoji,
  tint,
  size,
  className = "",
}: {
  emoji?: string | null;
  tint?: string | null;
  size: number;
  className?: string;
}) {
  const bg = (tint && AV_TINTS[tint]) || AV_TINTS[DEFAULT_AVATAR_TINT];
  const em = emoji || DEFAULT_AVATAR_EMOJI;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full leading-none ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.48) }}
    >
      {em}
    </span>
  );
}
