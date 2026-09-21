import Link from "next/link";
import BoardGateRefresh from "@/components/board/BoardGateRefresh";

/** What everyone except a joined member (or admin) sees instead of the
 * passenger list: the sailing's basic details, how many travelers have
 * joined, and a way in. Deliberately takes only public fields - no member
 * data may ever be passed to this component. */
export default function BoardGate({
  sailingId,
  lineLabel,
  shipName,
  dateLabel,
  port,
  travelerCount,
}: {
  sailingId: string;
  lineLabel: string;
  shipName: string;
  dateLabel: string;
  port: string;
  /** null when the count couldn't be fetched - the line is hidden then. */
  travelerCount: number | null;
}) {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-[100px] pb-16">
      <BoardGateRefresh sailingId={sailingId} />
      <div className="w-full max-w-[480px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
        <div className="bg-linear-to-br from-[#12a0ad] to-[#0a6e79] px-8 py-8 text-white">
          <div className="mb-2 text-[12px] font-bold tracking-[.1em] text-white/90 uppercase">{lineLabel}</div>
          <div className="font-display text-[26px] font-extrabold tracking-[-0.02em]">{shipName}</div>
          <div className="mt-1.5 text-[13px] font-semibold text-white/88">
            {dateLabel} · {port}
          </div>
        </div>
        <div className="px-8 py-7 text-center">
          {travelerCount !== null ? (
            <div className="text-[15px] font-semibold text-charcoal">
              {travelerCount} traveler{travelerCount === 1 ? "" : "s"} {travelerCount === 1 ? "has" : "have"} joined this sailing
            </div>
          ) : null}
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Join this sailing to see who&apos;s aboard. Traveler profiles are only visible to members of the same
            sailing.
          </p>
          <Link
            href={`/join/${sailingId}`}
            className="mt-5 block w-full rounded-xl bg-teal py-3.5 text-center font-sans text-[15px] font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            ⚓ Join this sailing to see who&apos;s aboard
          </Link>
          <Link href={`/sailing/${sailingId}`} className="mt-4 block text-[13px] text-muted-2 hover:text-muted">
            ← Back to this sailing
          </Link>
        </div>
      </div>
    </main>
  );
}
