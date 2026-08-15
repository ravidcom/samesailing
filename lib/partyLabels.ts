import type { PartyType } from "./auth-context";

export const PARTY_LABELS: Record<PartyType, string> = {
  family: "Family",
  couple: "Couple",
  solo: "Solo traveler",
  friends: "Friends group",
};
