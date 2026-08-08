import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import { getSailingById, memberCount, MIN_BROWSE_THRESHOLD } from "@/lib/cruiseData";

export default async function SailingResultPage({
  params,
}: PageProps<"/sailing/[id]">) {
  const { id } = await params;
  const sailing = getSailingById(id);
  if (!sailing) notFound();

  const n = memberCount(sailing.id);
  const dense = n >= MIN_BROWSE_THRESHOLD;

  return (
    <>
      <NavBar />
      <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
        <div className="w-full max-w-[480px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
          <div className="rounded-t-[22px] bg-linear-to-br from-[#12a0ad] to-[#0a6e79] px-8 py-8 text-white">
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

          <div className="px-8 py-7">
            <div className="mb-5 flex gap-6 text-sm">
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
              <div className="mb-4 inline-block rounded-full border border-[#b9e5e8] bg-teal-tint px-4 py-1.5 text-xs font-semibold text-teal">
                Founding member opportunity
              </div>
            ) : null}

            <p className="mb-6 text-sm leading-relaxed text-muted">
              {dense
                ? `Connect with ${n} travelers already on this exact sailing - before you even board. Group chat, private messages, and excursion planning all in one place.`
                : "Be among the first aboard! Join now and we'll email you as shipmates join. Founding members appear first when this sailing fills up."}
            </p>

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
