import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { getSailingById, MIN_BROWSE_THRESHOLD } from "@/lib/cruiseData";
import { daysUntilDate, countdownLabelForDays } from "@/lib/dateMath";
import { scarcityState } from "@/lib/pioneer";
import { createServerClient } from "@/lib/supabase/server";
import FoundingBadgeTiles from "@/components/board/FoundingBadgeTiles";

function describeSailing(sailing: NonNullable<Awaited<ReturnType<typeof getSailingById>>>): string {
  return `${sailing.shipName} sails a ${sailing.itinerary} itinerary, departing ${sailing.date} from ${sailing.port}. Meet fellow travelers on this exact sailing before you set sail.`;
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

  const supabase = createServerClient();
  const { count } = await supabase
    .from("joined_sailings")
    .select("id", { count: "exact", head: true })
    .eq("sailing_id", sailing.id);
  const n = count ?? 0;
  const dense = n >= MIN_BROWSE_THRESHOLD;
  const countdown = countdownLabelForDays(daysUntilDate(sailing.isoDate), sailing.nights);

  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <div className="w-full max-w-[480px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
          <div className="rounded-t-[22px] bg-linear-to-br from-[#12a0ad] to-[#0a6e79] px-8 py-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 text-[12px] font-bold tracking-[.1em] text-white/90 uppercase">
                  {sailing.line}
                </div>
                <div className="font-display text-[26px] font-extrabold tracking-[-0.02em]">
                  {sailing.shipName}
                </div>
                <div className="mt-1.5 text-[15px] font-semibold text-[#bff0f2]">
                  {sailing.itinerary}
                </div>
              </div>
              {countdown ? (
                <div className="shrink-0 whitespace-nowrap rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-bold">
                  ⏳ {countdown}
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-8 py-6">
            <p className="mb-4 text-sm leading-relaxed text-muted">
              Meet fellow travelers on this exact {sailing.shipName} sailing before you set sail.
            </p>

            <div className="mb-4 flex gap-6 text-sm">
              <div>
                <div className="mb-1 text-[11px] font-bold tracking-[.08em] text-muted-2 uppercase">
                  Departs
                </div>
                <div className="font-semibold text-charcoal">{sailing.date}</div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-bold tracking-[.08em] text-muted-2 uppercase">
                  From
                </div>
                <div className="font-semibold text-charcoal">{sailing.port}</div>
              </div>
            </div>

            {!dense ? (
              <div className="mb-3 inline-block rounded-full border border-[#b9e5e8] bg-teal-tint px-4 py-1.5 text-xs font-semibold text-teal">
                Founding member opportunity
              </div>
            ) : null}

            <p className="mb-4 text-sm leading-relaxed text-muted">
              {dense
                ? `Connect with ${n} travelers already on this exact sailing - before you even board. Group chat, private messages, and excursion planning all in one place.`
                : "Be among the first aboard - early joiners earn a badge on their passenger card."}
            </p>

            {!dense ? (
              <>
                <div className="mb-3">
                  <FoundingBadgeTiles />
                </div>
                {(() => {
                  const scarcity = scarcityState(n);
                  return (
                    <div
                      style={{ background: scarcity.bg, border: `1px solid ${scarcity.border}` }}
                      className="mb-5 flex items-center gap-2 rounded-xl px-3.5 py-3"
                    >
                      <span className="shrink-0 text-[15px]">🔥</span>
                      <span style={{ color: scarcity.color }} className="text-[13px] leading-snug font-semibold">
                        {scarcity.text}
                      </span>
                    </div>
                  );
                })()}
              </>
            ) : null}

            <Link
              href={`/join/${sailing.id}`}
              className="block w-full rounded-xl bg-teal py-3.5 text-center font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
            >
              {dense
                ? "⚓ Join this sailing - it's free"
                : "⚓ Join as a founding member - it's free"}
            </Link>

            {dense ? (
              <Link
                href={`/sailing/${sailing.id}/board`}
                className="mt-2.5 block w-full rounded-xl border-[1.5px] border-border py-3 text-center font-sans text-sm font-semibold text-muted transition-colors hover:border-teal hover:text-teal"
              >
                👀 Browse travelers first
              </Link>
            ) : null}

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
