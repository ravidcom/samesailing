import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import SailingHeaderCard from "@/components/board/SailingHeaderCard";
import PassengerBoard from "@/components/board/PassengerBoard";
import { getSailingById } from "@/lib/cruiseData";
import { daysUntilDate, countdownLabelForDays } from "@/lib/dateMath";
import { passengerFromProfile } from "@/lib/passengers";
import { createServerClient } from "@/lib/supabase/server";
import type { OnboardingProfile } from "@/lib/auth-context";

/** Return shape of the get_sailing_passengers() RPC - supabase-js can't
 * infer this on its own since the client isn't given a generated Database
 * type, so every .rpc() call below pins it explicitly via .returns(). */
type SailingPassengerRow = {
  user_id: string;
  profile: OnboardingProfile | null;
  join_rank: number | null;
  joined_at: string;
};

/** "October 25, 2026" -> "Oct 25, 2026" - the header meta line wants the
 * abbreviated month but (unlike the chat sidebar's shortDate()) keeps the
 * year, since there's no other date context on this compact card. */
function shortDateWithYear(label: string): string {
  const m = label.match(/^(\w+) (\d+), (\d+)$/);
  return m ? `${m[1].slice(0, 3)} ${m[2]}, ${m[3]}` : label;
}

export async function generateMetadata({ params }: PageProps<"/sailing/[id]/board">): Promise<Metadata> {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) return {};
  const { data: metaPassengerRows } = await createServerClient().rpc("get_sailing_passengers", {
    p_sailing_id: sailing.id,
  });
  const count = (metaPassengerRows as SailingPassengerRow[] | null)?.length ?? 0;
  const title = `${sailing.shipName} passengers - ${sailing.date}`;
  const description =
    count && count > 0
      ? `See who's already sailing on ${sailing.shipName}, departing ${sailing.date} from ${sailing.port} - ${count} traveler${count === 1 ? "" : "s"} have joined so far.`
      : `Browse passengers on ${sailing.shipName}, departing ${sailing.date} from ${sailing.port}.`;
  return {
    title,
    description,
    alternates: { canonical: `/sailing/${sailing.id}/board` },
    openGraph: { title, description, url: `/sailing/${sailing.id}/board` },
    twitter: { title, description },
  };
}

export default async function BoardPage({ params }: PageProps<"/sailing/[id]/board">) {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) notFound();

  const supabase = createServerClient();
  const { data: rpcRows } = await supabase.rpc("get_sailing_passengers", { p_sailing_id: sailing.id });
  const rows = rpcRows as SailingPassengerRow[] | null;
  const joined = (rows ?? []).filter(
    (r): r is SailingPassengerRow & { profile: OnboardingProfile } => !!r.profile
  );

  // Display names and avatars are account-level (lib/displayName.ts,
  // lib/avatars.ts), not stored in the per-sailing profile, so they need a
  // separate join against `profiles` - via the public_profiles view, which
  // masks `name` down to null unless the account picked real-name mode
  // (the raw table itself is no longer publicly readable for other users).
  const { data: nameRows } = await supabase
    .from("public_profiles")
    .select("id,name,name_mode,nickname,avatar,avatar_tint")
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
    const avatarFields = n ? { avatar: n.avatar, avatarTint: n.avatar_tint } : null;
    return passengerFromProfile(r.user_id, r.profile, nameFields, r.join_rank, avatarFields);
  });

  const countdown = countdownLabelForDays(daysUntilDate(sailing.isoDate), sailing.nights);
  const lineLabel = `${sailing.line} · ${sailing.nights} Nights`.toUpperCase();

  return (
    <>
      <NavBar />
      <main className="pt-[62px]">
        <div className="px-4 pt-3.5 sm:px-8 md:px-12">
          <div className="mx-auto max-w-[1000px]">
            <SailingHeaderCard
              sailingId={sailing.id}
              lineLabel={lineLabel}
              shipName={sailing.shipName}
              dateLabel={shortDateWithYear(sailing.date)}
              port={sailing.port}
              countdown={countdown}
            />
          </div>
        </div>

        <PassengerBoard
          key={sailing.id}
          sailingId={sailing.id}
          shipName={sailing.shipName}
          dateLabel={shortDateWithYear(sailing.date)}
          passengers={passengers}
        />
      </main>
    </>
  );
}
