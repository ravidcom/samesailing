import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import SailingHeaderCard from "@/components/board/SailingHeaderCard";
import PassengerBoard from "@/components/board/PassengerBoard";
import { getSailingById } from "@/lib/cruiseData";
import { daysUntilDate, countdownLabelForDays } from "@/lib/dateMath";
import { passengerFromProfile } from "@/lib/passengers";
import type { NameFields } from "@/lib/displayName";
import {
  getCachedSailingPassengers,
  getCachedSailingPassengerNames,
  type SailingPassengerRow,
} from "@/lib/sailingPassengers";
import type { OnboardingProfile } from "@/lib/auth-context";

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
  const metaPassengerRows = await getCachedSailingPassengers(sailing.id);
  const count = metaPassengerRows.length;
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

  const rows = await getCachedSailingPassengers(sailing.id);
  const joined = rows.filter(
    (r): r is SailingPassengerRow & { profile: OnboardingProfile } => !!r.profile
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
    // requires - same untyped-supabase-client gap as elsewhere in this
    // file, previously invisible because nameRows was implicitly `any`.
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

  // Lets Google show a path (Home > Ship - Date > Passengers) instead of
  // the raw URL for this page's search result.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://samesailing.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: `${sailing.shipName} - ${sailing.date}`,
        item: `https://samesailing.com/sailing/${sailing.id}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Passengers",
        item: `https://samesailing.com/sailing/${sailing.id}/board`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
