import type { OnboardingProfile, PartyType } from "./auth-context";
import { PARTY_LABELS } from "./partyLabels";
import { GOALS } from "./goals";
import { resolveDisplayName, type NameFields } from "./displayName";

export type Passenger = {
  id: string;
  t: PartyType;
  av: string;
  avBg: string;
  name: string;
  anon: boolean;
  who: string;
  sub: string;
  langs: string[];
  country?: string;
  goals: string[];
  cue: string;
  lgbtq: boolean;
};

const AVATAR_BG: Record<PartyType, string> = {
  family: "#dff1f2",
  couple: "#fff3eb",
  solo: "#fff3eb",
  friends: "#fff3eb",
};

/** Builds a passenger card from a real joined_sailings row's stored profile. */
export function passengerFromProfile(
  id: string,
  profile: OnboardingProfile,
  nameFields?: NameFields | null
): Passenger {
  const sub =
    profile.partyType === "family" && profile.kids.length
      ? profile.kids.map((k) => `${k.gender || "Child"}${k.age ? " " + k.age : ""}`).join(", ")
      : profile.ageRanges.length
        ? `ages ${profile.ageRanges.map((a) => a.replace("-", "–")).join(", ")}`
        : "";
  const { name, anon } = resolveDisplayName(id, profile.partyType, nameFields);
  return {
    id,
    t: profile.partyType,
    av: profile.avatar,
    avBg: AVATAR_BG[profile.partyType] ?? "#dff1f2",
    name,
    anon,
    who: PARTY_LABELS[profile.partyType],
    sub,
    langs: [],
    country: profile.country || undefined,
    goals: profile.goals.map((gid) => GOALS.find((g) => g.id === gid)?.label ?? gid),
    cue: profile.bio || (profile.country ? `From ${profile.country}` : "Just joined"),
    // Older rows stored before this field existed won't have it.
    lgbtq: profile.lgbtq ?? false,
  };
}
