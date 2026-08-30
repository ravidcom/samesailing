import type { OnboardingProfile, PartyType } from "./auth-context";
import { PARTY_LABELS } from "./partyLabels";
import { GOALS } from "./goals";
import { resolveDisplayName, type NameFields } from "./displayName";
import { sanitizeAvatar } from "./avatars";

export type Passenger = {
  id: string;
  t: PartyType;
  avatarEmoji: string;
  avatarTint: string;
  name: string;
  anon: boolean;
  who: string;
  ageLabel: string;
  country?: string;
  goals: string[];
  bio: string;
  lgbtq: boolean;
  kids: { gender: string; age: string }[];
  /** Pioneer badge rank on this sailing (1-10), assigned at join time. Null past slot 10. */
  joinRank: number | null;
};

/** Builds a passenger card from a real joined_sailings row's stored profile.
 * The avatar is account-level (My profile), not part of the per-sailing
 * profile - avatarFields comes from a separate `profiles` lookup, same as
 * nameFields, and sanitizeAvatar() re-validates it here since a stored row
 * could in principle predate the current emoji/tint sets. */
export function passengerFromProfile(
  id: string,
  profile: OnboardingProfile,
  nameFields?: NameFields | null,
  joinRank: number | null = null,
  avatarFields?: { avatar: string; avatarTint: string } | null
): Passenger {
  const { name, anon } = resolveDisplayName(id, profile.partyType, nameFields);
  const { emoji, tint } = sanitizeAvatar(avatarFields?.avatar, avatarFields?.avatarTint);
  return {
    id,
    t: profile.partyType,
    avatarEmoji: emoji,
    avatarTint: tint,
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
    joinRank,
  };
}
