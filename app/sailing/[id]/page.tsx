import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { getSailingById, MIN_BROWSE_THRESHOLD } from "@/lib/cruiseData";
import { daysUntilDate, countdownLabelForDays } from "@/lib/dateMath";
import { getCachedSailingPassengers, getCachedSailingPassengerNames } from "@/lib/sailingPassengers";
import { shortDateWithYear } from "@/lib/sailingLabel";
import { sanitizeAvatar } from "@/lib/avatars";
import Avatar from "@/components/ui/Avatar";

function describeSailing(sailing: NonNullable<Awaited<ReturnType<typeof getSailingById>>>): string {
  return `${sailing.shipName} sails a ${sailing.itinerary} itinerary, departing ${sailing.date} from ${sailing.port}. Meet fellow travelers on this exact sailing before you set sail.`;
}

/** "Transatlantic Barcelona to Fort Lauderdale · 13 nights" -> "Transatlantic
 * · Barcelona → Fort Lauderdale · 13 nights" - the region reads as its own
 * fact and the two ports read as a route instead of a sentence ("to"). */
function formatItineraryArrow(sailing: NonNullable<Awaited<ReturnType<typeof getSailingById>>>): string {
  const [routePart, ...restParts] = sailing.itinerary.split(" · ");
  const rest = restParts.join(" · ");
  const region = sailing.region;
  const route = region && routePart.startsWith(`${region} `) ? routePart.slice(region.length + 1) : routePart;
  return [region, route.replace(" to ", " → "), rest].filter(Boolean).join(" · ");
}

export async function generateMetadata({ params }: PageProps<"/sailing/[id]">): Promise<Metadata> {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) return {};
  const title = `${sailing.shipName} - ${sailing.date}`;
  const description = describeSailing(sailing);
  return {
    title,
    description,
    alternates: { canonical: `/sailing/${sailing.id}` },
    openGraph: { title, description, url: `/sailing/${sailing.id}` },
    twitter: { title, description },
  };
}

export default async function SailingResultPage({
  params,
}: PageProps<"/sailing/[id]">) {
  const { id } = await params;
  const sailing = await getSailingById(id);
  if (!sailing) notFound();

  const passengerRows = await getCachedSailingPassengers(sailing.id);
  const n = passengerRows.length;
  const dense = n >= MIN_BROWSE_THRESHOLD;

  // Real member avatars for the social-proof stack - up to the first 3
  // passengers, in the order the RPC returned them. Only fetched for the
  // dense/populated path, where the stack actually shows.
  const avatarIds = dense ? passengerRows.slice(0, 3).map((r) => r.user_id) : [];
  const avatarNameRows = avatarIds.length > 0 ? await getCachedSailingPassengerNames(sailing.id, avatarIds) : [];
  const avatarById = new Map(avatarNameRows.map((r) => [r.id, r]));
  const stackAvatars = avatarIds
    .map((id) => avatarById.get(id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);
  // Dropping the "to go" suffix (kept on /board's countdown pill) protects
  // this hero from wrapping on narrow phones - the ⏳ prefix already reads
  // as a countdown without it.
  const countdown = countdownLabelForDays(daysUntilDate(sailing.isoDate), sailing.nights).replace(/ to go$/, "");

  // Lets Google show a path (Home > Ship - Date) instead of the raw URL
  // for this page's search result.
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
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <div className="w-full max-w-[480px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
          <div className="rounded-t-[22px] bg-linear-to-br from-[#12a0ad] to-[#0a6e79] px-8 py-8 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-[12px] font-bold tracking-[.1em] text-white/90 uppercase">
                  {sailing.line}
                </div>
                <div
                  className={`font-display font-extrabold tracking-[-0.02em] ${dense ? "text-[25px]" : "text-[26px]"}`}
                >
                  {sailing.shipName}
                </div>
                <div
                  className={
                    dense
                      ? "mt-1.5 text-[13.5px] font-semibold text-[#bff0f2] opacity-[.92]"
                      : "mt-1.5 text-[15px] font-semibold text-[#bff0f2]"
                  }
                >
                  {dense ? formatItineraryArrow(sailing) : sailing.itinerary}
                </div>
                <div
                  className={
                    dense
                      ? "mt-1.5 text-[13px] font-semibold text-white/86"
                      : "mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-white/88"
                  }
                >
                  {dense ? (
                    <>
                      {shortDateWithYear(sailing.date)} · departs {sailing.port}
                    </>
                  ) : (
                    <>
                      <span>{shortDateWithYear(sailing.date)}</span>
                      <span className="opacity-50">·</span>
                      <span>{sailing.port}</span>
                    </>
                  )}
                </div>
              </div>
              {countdown ? (
                <div
                  className={
                    dense
                      ? "shrink-0 whitespace-nowrap rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[11.5px] font-bold"
                      : "shrink-0 whitespace-nowrap rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-bold"
                  }
                >
                  ⏳ {countdown}
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-8 py-7">
            {dense ? (
              <>
                <div className="mb-[13px] flex items-center gap-2.5">
                  {stackAvatars.length > 0 ? (
                    <div className="flex shrink-0">
                      {stackAvatars.map((row, i) => {
                        const { emoji, tint } = sanitizeAvatar(row.avatar, row.avatar_tint);
                        return (
                          <span
                            key={row.id}
                            className={i > 0 ? "-ml-2.5 rounded-full" : "rounded-full"}
                            style={{ boxShadow: "0 0 0 2px #fff" }}
                          >
                            <Avatar emoji={emoji} tint={tint} size={29} />
                          </span>
                        );
                      })}
                      {n > 3 ? (
                        <span
                          className="-ml-2.5 flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-full bg-teal text-[10.5px] font-extrabold text-white"
                          style={{ boxShadow: "0 0 0 2px #fff" }}
                        >
                          +{n - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="text-[13.5px] leading-[1.4] font-semibold text-muted">
                    <span className="font-extrabold text-charcoal">
                      {n} traveler{n === 1 ? "" : "s"}
                    </span>{" "}
                    are already aboard
                  </div>
                </div>

                <Link
                  href={`/join/${sailing.id}`}
                  className="block w-full rounded-xl bg-teal py-3.5 text-center font-sans text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-teal-dark active:scale-[.98]"
                >
                  ⚓ Join this sailing - it&apos;s free
                </Link>
                <Link
                  href={`/sailing/${sailing.id}/board`}
                  className="mt-2.5 block w-full rounded-xl border-[1.5px] border-border py-3 text-center font-sans text-sm font-semibold text-muted transition-[border-color,color,transform] duration-150 hover:border-teal hover:text-teal active:scale-[.98]"
                >
                  👀 Browse travelers first
                </Link>

                <div className="my-[17px] h-px bg-[#eef6f7]" />

                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-[17px] leading-[1.3]">💬</div>
                    <div className="mt-[3px] text-[12.5px] font-bold text-charcoal">Group chat</div>
                    <div className="mt-px text-[11.5px] leading-[1.35] text-muted-2">Everyone on board</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[17px] leading-[1.3]">✉️</div>
                    <div className="mt-[3px] text-[12.5px] font-bold text-charcoal">Private messages</div>
                    <div className="mt-px text-[11.5px] leading-[1.35] text-muted-2">One to one</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[17px] leading-[1.3]">📍</div>
                    <div className="mt-[3px] text-[12.5px] font-bold text-charcoal">Meet-ups</div>
                    <div className="mt-px text-[11.5px] leading-[1.35] text-muted-2">Onboard &amp; in port</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  href={`/join/${sailing.id}`}
                  className="block w-full rounded-xl bg-teal py-3.5 text-center font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
                >
                  ⚓ Join this sailing - it&apos;s free
                </Link>

                <div className="my-[18px] h-px bg-[#eef6f7]" />

                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="text-[17px] leading-[1.3]">💬</div>
                    <div className="mt-[3px] text-[12.5px] font-bold text-charcoal">Group chat</div>
                    <div className="mt-px text-[11.5px] leading-[1.35] text-muted-2">Everyone on board</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[17px] leading-[1.3]">✉️</div>
                    <div className="mt-[3px] text-[12.5px] font-bold text-charcoal">Private messages</div>
                    <div className="mt-px text-[11.5px] leading-[1.35] text-muted-2">One to one</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[17px] leading-[1.3]">🌍</div>
                    <div className="mt-[3px] text-[12.5px] font-bold text-charcoal">Community chat</div>
                    <div className="mt-px text-[11.5px] leading-[1.35] text-muted-2">Every SameSailing traveler</div>
                  </div>
                </div>
              </>
            )}

            <Link
              href="/"
              className="mt-4 block text-center text-[13px] text-muted-2 hover:text-muted"
            >
              ← Back to search
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
