import type { PartyType } from "./auth-context";

export const PARTY_LABELS: Record<PartyType, string> = {
  family: "Family",
  couple: "Couple",
  solo: "Solo traveler",
  friends: "Friends group",
};

/** Shown in the passenger card's subline, now that the avatar itself is
 * user-chosen rather than doubling as the party-type signal. Note friends
 * is 👯, not 🎉 - 🎉 reads as an event, not a group. */
export const PARTY_ICON: Record<PartyType, string> = {
  solo: "👦",
  couple: "👩‍❤️‍👨",
  friends: "👯",
  family: "👨‍👩‍👧‍👦",
};
