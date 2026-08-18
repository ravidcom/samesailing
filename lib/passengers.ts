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
  ageLabel: string;
  country?: string;
  goals: string[];
  bio: string;
  lgbtq: boolean;
  kids: { gender: string; age: string }[];
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
  const { name, anon } = resolveDisplayName(id, profile.partyType, nameFields);
  return {
    id,
    t: profile.partyType,
    av: profile.avatar,
    avBg: AVATAR_BG[profile.partyType] ?? "#dff1f2",
    name,
    anon,
    who: PARTY_LABELS[profile.partyType],
    ageLabel: profile.ageRanges.map((a) => a.replace("-", "–")).join(", "),
    country: profile.country || undefined,
    goals: profile.goals.map((gid) => GOALS.find((g) => g.id === gid)?.label ?? gid),
    bio: profile.bio,
    // Older rows stored before this field existed won't have it.
    lgbtq: profile.lgbtq ?? false,
    kids: profile.kids,
  };
}
