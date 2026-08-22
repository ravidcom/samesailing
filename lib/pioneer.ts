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
  /** How much padding-right the card's name column needs to keep clear of the ribbon. */
  cardPaddingRightPx: number;
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
  cardPaddingRightPx: 120,
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
  cardPaddingRightPx: 120,
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
  cardPaddingRightPx: 120,
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
  cardPaddingRightPx: 104,
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

export type FoundingTile = {
  tier: BadgeTier;
  emoji: string;
  label: string;
  caption: string;
  gradient: string;
  ringColor: string;
  labelColor: string;
  tip: string;
};

export const FOUNDING_TILES: FoundingTile[] = [
  {
    tier: "gold",
    emoji: "🏆",
    label: "1st aboard",
    caption: "GOLD",
    gradient: "linear-gradient(165deg,#fdf6e2,#f7e6b6)",
    ringColor: "#d9a326",
    labelColor: "#6b4c0a",
    tip: "Gold frame: the very first traveler to join this sailing.",
  },
  {
    tier: "silver",
    emoji: "🥈",
    label: "2nd aboard",
    caption: "SILVER",
    gradient: "linear-gradient(165deg,#f6f8fa,#e2e8ed)",
    ringColor: "#a8b2ba",
    labelColor: "#3f4d58",
    tip: "Silver frame: the second traveler aboard, back when the board was almost empty.",
  },
  {
    tier: "bronze",
    emoji: "🥉",
    label: "3rd aboard",
    caption: "BRONZE",
    gradient: "linear-gradient(165deg,#fdf3ea,#f2ddc9)",
    ringColor: "#c07f45",
    labelColor: "#6c3e19",
    tip: "Bronze frame: the third traveler aboard, before this sailing filled up.",
  },
  {
    tier: "crew",
    emoji: "⚓",
    label: "Early crew",
    caption: "4TH-10TH",
    gradient: "linear-gradient(165deg,#f2f8f8,#e0edee)",
    ringColor: "#c5e2e4",
    labelColor: "#3a565b",
    tip: "Early crew: travelers 4 to 10 to join. No medal, but still first aboard.",
  },
];

export function medalSpotsLeft(joined: number): number {
  return Math.max(0, MEDAL_SLOTS - joined);
}

export function crewSpotsLeft(joined: number): number {
  return Math.max(0, BADGE_SLOTS - Math.max(joined, MEDAL_SLOTS));
}

export type ScarcityState = { text: string; bg: string; border: string; color: string };

/**
 * Derived entirely from the sailing's already-tracked member count - no
 * second counter. Recompute on every render so it reflects the sailing
 * being viewed and drops as others join.
 */
export function scarcityState(joined: number): ScarcityState {
  const medalsLeft = medalSpotsLeft(joined);
  if (medalsLeft > 0) {
    return {
      text: `Only ${medalsLeft} medal ${medalsLeft === 1 ? "spot" : "spots"} remaining for this sailing (out of ${MEDAL_SLOTS})`,
      bg: "#fff3eb",
      border: "#ffd9c9",
      color: medalsLeft <= 2 ? "#c2432b" : "#a8613a",
    };
  }
  const crewLeft = crewSpotsLeft(joined);
  if (crewLeft > 0) {
    return {
      text: `Medals are claimed - ${crewLeft} Early crew ${crewLeft === 1 ? "spot" : "spots"} left (out of ${BADGE_SLOTS - MEDAL_SLOTS})`,
      bg: "#f4f9f9",
      border: "#d5e6e7",
      color: "#4c6d72",
    };
  }
  return {
    text: `All ${BADGE_SLOTS} badge spots on this sailing are claimed`,
    bg: "#eef5f5",
    border: "#d5e6e7",
    color: "#4c6d72",
  };
}
