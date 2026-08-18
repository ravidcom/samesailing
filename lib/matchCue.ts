import type { Passenger } from "./passengers";

export type MatchCue = { text: string; hasMatch: boolean };

function kidsCue(myKids: Passenger["kids"], theirKids: Passenger["kids"]): string | null {
  const myAges = myKids.map((k) => parseInt(k.age, 10)).filter((n) => !isNaN(n));
  const theirAges = theirKids.map((k) => parseInt(k.age, 10)).filter((n) => !isNaN(n));
  if (!myAges.length || !theirAges.length) return null;
  const close = [...new Set(theirAges.filter((ta) => myAges.some((ma) => Math.abs(ma - ta) <= 1)))].sort(
    (a, b) => a - b
  );
  if (!close.length) return null;
  if (close.length === 1) return `Kid aged ${close[0]} — close in age to yours`;
  return `Kids aged ${close.slice(0, 2).join(" and ")} — a year either side of yours`;
}

/**
 * The green "match line" on a passenger card - one line, one reason, the
 * first rule below that applies. Never repeats country or party type since
 * those are already in the card's subtitle.
 *
 * Language overlap is deliberately not one of the rules: this app has never
 * collected a passenger's spoken languages anywhere in onboarding, so there
 * is no real data to check that rule against.
 */
export function matchCue(me: Passenger | null, them: Passenger): MatchCue {
  if (me) {
    const shared = me.goals.filter((g) => them.goals.includes(g));
    if (shared.length >= 2) return { text: `You both want ${shared[0]} and ${shared[1]}`, hasMatch: true };
    if (shared.length === 1) return { text: `You both want ${shared[0]}`, hasMatch: true };

    if (me.t === "family" && them.t === "family") {
      const cue = kidsCue(me.kids, them.kids);
      if (cue) return { text: cue, hasMatch: true };
    }

    if (me.t === "solo" && them.t === "solo") {
      return { text: "Sailing solo, like you", hasMatch: true };
    }
  }

  return { text: them.bio || "Just joined", hasMatch: false };
}
