/**
 * The Pioneer badge system: the first 10 travelers to join a sailing (by
 * join order, assigned once and never recomputed) earn a badge - gold /
 * silver / bronze for the first three, "Early crew" for 4th-10th. Colors,
 * copy, and thresholds here are locked to HANDOFF - Pioneer Badges v2.md;
 * treat that file as the source of truth if this ever needs re-deriving.
 */

export const MEDAL_SLOTS = 3;
export const BADGE_SLOTS = 10;

export type BadgeTier = "gold" | "silver" | "bronze" | "crew";

export type Badge = {
  tier: BadgeTier;
  ribbonLabel: string;
  frame: string;
  ribbonBg: string;
  ribbonFg: string;
  tipBg: string;
  tipBorder: string;
  tip: string;
};

const GOLD: Badge = {
  tier: "gold",
  ribbonLabel: "🏆 1st aboard",
  frame: "#d9a326",
  ribbonBg: "#d9a326",
  ribbonFg: "#fff",
  tipBg: "#fdf7e6",
  tipBorder: "#efdda6",
  tip: "The very first traveler to join this sailing - they started this board.",
};

const SILVER: Badge = {
  tier: "silver",
  ribbonLabel: "🥈 2nd aboard",
  frame: "#a8b2ba",
  ribbonBg: "#eef1f4",
  ribbonFg: "#566672",
  tipBg: "#f4f6f8",
  tipBorder: "#dde3e8",
  tip: "The second traveler to join this sailing, back when it was almost empty.",
};

const BRONZE: Badge = {
  tier: "bronze",
  ribbonLabel: "🥉 3rd aboard",
  frame: "#c07f45",
  ribbonBg: "#f9ede3",
  ribbonFg: "#8a5325",
  tipBg: "#fbf1e8",
  tipBorder: "#ecd3bd",
  tip: "The third traveler to join this sailing, back when it was almost empty.",
};

const CREW: Badge = {
  tier: "crew",
  ribbonLabel: "⚓ Early crew",
  frame: "#c5e2e4",
  ribbonBg: "#eff6f6",
  ribbonFg: "#4c6d72",
  tipBg: "#f3f8f8",
  tipBorder: "#d5e6e7",
  tip: "Among the first 10 travelers to join this sailing - they got here before the board filled up.",
};

/**
 * Early crew's card top-border/avatar-ring intentionally departs from its
 * own ribbon color (#c5e2e4) - the handoff calls for plain teal there, with
 * no ring at all, so only the top three keep metal on the frame.
 */
export const CREW_CARD_BORDER = "#0E8C99";

export function badgeForRank(rank: number | null | undefined): Badge | null {
  if (!rank || rank < 1) return null;
  if (rank === 1) return GOLD;
  if (rank === 2) return SILVER;
  if (rank === 3) return BRONZE;
  if (rank <= BADGE_SLOTS) return CREW;
  return null;
}

