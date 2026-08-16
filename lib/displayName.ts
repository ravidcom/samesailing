import type { PartyType } from "./auth-context";

export type NameMode = "anon" | "nick" | "real";

export type NameFields = {
  nameMode: NameMode;
  nickname: string;
  /** Reuses profiles.name, the same field collected at signup. */
  name: string;
};

const HANDLE_WORDS = [
  "Coral",
  "Harbour",
  "Lagoon",
  "Dune",
  "Cove",
  "Reef",
  "Tide",
  "Marina",
  "Compass",
  "Sunset",
  "Anchor",
  "Breeze",
];

const HANDLE_NOUNS: Record<PartyType, string> = {
  family: "Family",
  couple: "Couple",
  solo: "Solo",
  friends: "Friends",
};

/**
 * Deterministic, stable per (userId, partyType) — the same person always
 * gets the same handle for a given party type, and different people (almost
 * certainly) get different handles. Party type is folded into the seed
 * because it's per-sailing, not account-level, so someone's handle can
 * differ across sailings the same way their party type can.
 */
export function handleFor(userId: string, partyType: PartyType): string {
  const noun = HANDLE_NOUNS[partyType];
  const key = userId + partyType;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return `${HANDLE_WORDS[h % HANDLE_WORDS.length]} ${noun}`;
}

/**
 * The single source of truth for how a passenger is labelled anywhere in
 * the UI: their chosen nickname or real name (shown exactly as they entered
 * it in My profile), or a generated handle if they never opened My profile
 * (or picked a mode without filling in the field it needs).
 */
export function resolveDisplayName(
  userId: string,
  partyType: PartyType,
  fields: NameFields | null | undefined
): { name: string; anon: boolean } {
  if (fields?.nameMode === "nick" && fields.nickname) {
    return { name: fields.nickname, anon: false };
  }
  if (fields?.nameMode === "real" && fields.name) {
    return { name: fields.name, anon: false };
  }
  return { name: handleFor(userId, partyType), anon: true };
}
