import { getSailingById } from "@/lib/cruiseData";
import { daysUntilDate, countdownLabelForDays } from "@/lib/dateMath";
import { passengerFromProfile, type Passenger } from "@/lib/passengers";
import type { NameFields } from "@/lib/displayName";
import { getCachedSailingPassengers, getCachedSailingPassengerNames } from "@/lib/sailingPassengers";
import type { OnboardingProfile } from "@/lib/auth-context";

export type BoardData = {
  sailingId: string;
  lineLabel: string;
  shipName: string;
  dateLabel: string;
  port: string;
  countdown: string;
  passengers: Passenger[];
};

/** "October 25, 2026" -> "Oct 25, 2026" - the header meta line wants the
 * abbreviated month but (unlike the chat sidebar's shortDate()) keeps the
 * year, since there's no other date context on this compact card. */
function shortDateWithYear(label: string): string {
  const m = label.match(/^(\w+) (\d+), (\d+)$/);
  return m ? `${m[1].slice(0, 3)} ${m[2]}, ${m[3]}` : label;
}

/** Everything the Passengers screen needs for one sailing - shared by the
 * initial server render (app/sailing/[id]/board/page.tsx) and the
 * client-side re-fetch the in-place sailing switcher uses, so the two never
 * compute this differently. */
export async function getBoardData(sailingId: string): Promise<BoardData | null> {
  const sailing = await getSailingById(sailingId);
  if (!sailing) return null;

  const rows = await getCachedSailingPassengers(sailing.id);
  const joined = rows.filter(
    (r): r is (typeof rows)[number] & { profile: OnboardingProfile } => !!r.profile
  );

  // Display names and avatars are account-level (lib/displayName.ts,
  // lib/avatars.ts), not stored in the per-sailing profile, so they need a
  // separate join against `profiles` - via the public_profiles view, which
  // masks `name` down to null unless the account picked real-name mode
  // (the raw table itself is no longer publicly readable for other users).
  const nameRows = await getCachedSailingPassengerNames(
    sailing.id,
    joined.map((r) => r.user_id)
  );
  const namesById = new Map(nameRows.map((r) => [r.id, r]));

  const passengers = joined.map((r) => {
    const n = namesById.get(r.user_id);
    // public_profiles' columns are looser (string | null) than NameFields
    // requires - same untyped-supabase-client gap as elsewhere, previously
    // invisible because nameRows was implicitly `any`.
    const nameFields = n
      ? ({ nameMode: n.name_mode, nickname: n.nickname, name: n.name } as NameFields)
      : null;
    const avatarFields = n
      ? ({ avatar: n.avatar, avatarTint: n.avatar_tint } as { avatar: string; avatarTint: string })
      : null;
    return passengerFromProfile(r.user_id, r.profile, nameFields, r.join_rank, avatarFields);
  });

  const countdown = countdownLabelForDays(daysUntilDate(sailing.isoDate), sailing.nights);
  const lineLabel = `${sailing.line} · ${sailing.nights} Nights`.toUpperCase();

  return {
    sailingId: sailing.id,
    lineLabel,
    shipName: sailing.shipName,
    dateLabel: shortDateWithYear(sailing.date),
    port: sailing.port,
    countdown,
    passengers,
  };
}
