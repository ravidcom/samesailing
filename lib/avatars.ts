/**
 * Avatars v1: an account-level emoji + background tint, chosen only from
 * My profile (never during signup). Every glyph below is a single
 * codepoint (or codepoint + VS16) on purpose - no ZWJ joiners, which split
 * into two glyphs or render as an empty box on older devices. If the sets
 * grow later, keep that rule.
 */

export const AV_PEOPLE = [
  "👦", "👧", "🧑", "👱", "👨", "👩", "🧔", "👶",
  "🧓", "👵", "👴", "🧕", "👳", "👲", "👰", "🤵",
  "🕵️", "🧜", "🧚", "🧙", "🦸", "🤠", "😎", "🥳",
];
export const AV_CREATURES = ["🐟", "🐬", "🐢", "🦜", "🐙", "🐨", "🐶", "🦩"];
export const AV_SEA = ["⚓", "⛵", "🌴", "☀️", "🌊", "🍹", "🌍", "🧭"];

export const AV_TINTS: Record<string, string> = {
  peach: "#fdeadf",
  teal: "#e2f2f3",
  lilac: "#eae6f7",
  mint: "#e6f3ec",
  butter: "#fdf2d8",
  rose: "#f7e4e9",
  sky: "#ddeaf9",
  sand: "#f0ece4",
};

export const DEFAULT_AVATAR_EMOJI = "🧑";
export const DEFAULT_AVATAR_TINT = "peach";

const AV_ALL = [...AV_PEOPLE, ...AV_CREATURES, ...AV_SEA];

export function isValidAvatar(emoji: string, tint: string): boolean {
  return AV_ALL.includes(emoji) && Object.prototype.hasOwnProperty.call(AV_TINTS, tint);
}

/** Falls back to the default pair wholesale rather than mixing a valid
 * emoji with an invalid tint (or vice versa) - a partially-sanitized combo
 * that was never actually chosen together isn't meaningfully "more right"
 * than the plain default. */
export function sanitizeAvatar(
  emoji: string | null | undefined,
  tint: string | null | undefined
): { emoji: string; tint: string } {
  if (emoji && tint && isValidAvatar(emoji, tint)) return { emoji, tint };
  return { emoji: DEFAULT_AVATAR_EMOJI, tint: DEFAULT_AVATAR_TINT };
}
