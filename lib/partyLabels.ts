import type { OnboardingProfile, PartyType } from "./auth-context";

export const PARTY_LABELS: Record<PartyType, string> = {
  family: "Family",
  couple: "Couple",
  solo: "Solo traveler",
  friends: "Friends group",
};

/** The partial-profile label shown to other travelers in place of a real name, e.g. "Family · ages 35–45". */
export function profileLabel(profile: OnboardingProfile | null | undefined): string {
  if (!profile) return "Traveler";
  const who = PARTY_LABELS[profile.partyType];
  const sub =
    profile.partyType === "family" && profile.kids.length
      ? profile.kids.map((k) => `${k.gender || "Child"}${k.age ? " " + k.age : ""}`).join(", ")
      : profile.ageRanges.length
        ? `ages ${profile.ageRanges.map((a) => a.replace("-", "–")).join(", ")}`
        : "";
  return sub ? `${who} · ${sub}` : who;
}
