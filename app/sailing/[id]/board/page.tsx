import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import SailingHeaderCard from "@/components/board/SailingHeaderCard";
import PassengerBoard from "@/components/board/PassengerBoard";
import { getSailingById } from "@/lib/cruiseData";
import { daysUntilDate, countdownLabelForDays } from "@/lib/dateMath";
import { passengerFromProfile } from "@/lib/passengers";
import { createServerClient } from "@/lib/supabase/server";
import type { OnboardingProfile } from "@/lib/auth-context";

/** "October 25, 2026" -> "Oct 25, 2026" - the header meta line wants the
 * abbreviated month but (unlike the chat sidebar's shortDate()) keeps the
 * year, since there's no other date context on this compact card. */
function shortDateWithYear(label: string): string {
  const m = label.match(/^(\w+) (\d+), (\d+)$/);
  return m ? `${m[1].slice(0, 3)} ${m[2]}, ${m[3]}` : label;
}

export default async function BoardPage({ params }: PageProps<"/sailing/[id]/board">) {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) notFound();

  const supabase = createServerClient();
  const { data: rows } = await supabase
    .from("joined_sailings")
    .select("user_id,profile,join_rank")
    .eq("sailing_id", sailing.id);
  const joined = (rows ?? []).filter(
    (r): r is { user_id: string; profile: OnboardingProfile; join_rank: number | null } => !!r.profile
  );

  // Display names are account-level (lib/displayName.ts), not stored in the
  // per-sailing profile, so they need a separate join against `profiles`.
  const { data: nameRows } = await supabase
    .from("profiles")
    .select("id,name,name_mode,nickname")
    .in(
      "id",
      joined.map((r) => r.user_id)
    );
  const namesById = new Map((nameRows ?? []).map((r) => [r.id, r]));

  const passengers = joined.map((r) => {
    const n = namesById.get(r.user_id);
    const nameFields = n
      ? { nameMode: n.name_mode, nickname: n.nickname, name: n.name }
      : null;
    return passengerFromProfile(r.user_id, r.profile, nameFields, r.join_rank);
  });

  const countdown = countdownLabelForDays(daysUntilDate(sailing.isoDate));
  const nights = sailing.itinerary.match(/\d+/)?.[0] ?? "";
  const lineLabel = `${sailing.line} · ${nights} Nights`.toUpperCase();

  return (
    <>
      <NavBar />
      <main className="pt-[62px]">
        <div className="mx-auto max-w-[1000px] px-3.5 pt-3.5">
          <SailingHeaderCard
            sailingId={sailing.id}
            lineLabel={lineLabel}
            shipName={sailing.shipName}
            dateLabel={shortDateWithYear(sailing.date)}
            port={sailing.port}
            countdown={countdown}
          />
        </div>

        <PassengerBoard key={sailing.id} sailingId={sailing.id} passengers={passengers} />
      </main>
    </>
  );
}
