import Link from "next/link";
import { shortDateWithYear } from "@/lib/sailingLabel";
import ShareInviteButton from "@/components/ui/ShareInviteButton";

type Props = {
  shipName: string | null;
  date: string | null;
  sailingId: string | null;
  travelerCount: number | null;
  onOpenGroupChat: () => void;
  onBrowseBoard: () => void;
  onGoToDashboard: () => void;
};

/** "Your profile is visible to {n} travelers" counts fellow travelers, not
 * the user themself - travelerCount (from the passenger RPC) includes the
 * join that just happened, so it's off by one from what the sentence says. */
function visibilitySubline(travelerCount: number | null): string {
  if (travelerCount === null) return "Your profile is now visible to fellow travelers";
  const others = travelerCount - 1;
  if (others <= 0) return "Your profile is live - you're first aboard";
  if (others === 1) return "Your profile is visible to 1 traveler";
  return `Your profile is visible to ${others} travelers`;
}

export default function StepSuccess({
  shipName,
  date,
  sailingId,
  travelerCount,
  onOpenGroupChat,
  onBrowseBoard,
  onGoToDashboard,
}: Props) {
  const shareUrl = sailingId ? `https://samesailing.com/sailing/${sailingId}` : null;
  const sailingLine = shipName && date ? `${shipName} · ${shortDateWithYear(date)}` : null;

  return (
    <div className="px-0 pt-2.5 pb-1 text-center">
      <div className="mb-1.5 flex items-center justify-center gap-2.5">
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-teal-tint text-[19px]">
          ⚓
        </span>
        <span className="font-display text-2xl font-bold text-charcoal">You&apos;re aboard!</span>
      </div>

      {sailingId ? (
        <>
          {sailingLine ? <div className="mb-1 text-[13.5px] font-bold text-teal-dark">{sailingLine}</div> : null}
          <div className="mb-[17px] text-[13px] font-semibold text-muted-2">{visibilitySubline(travelerCount)}</div>

          <button type="button" className={primaryButtonClass} onClick={onOpenGroupChat}>
            💬 Open group chat →
          </button>
          <button type="button" className={secondaryButtonClass} onClick={onBrowseBoard}>
            👫 Browse the passenger board
          </button>

          {shareUrl ? (
            <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-teal-tint px-[15px] py-3.5 text-left">
              <span className="shrink-0 text-[21px]">🔗</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] leading-tight font-extrabold text-charcoal">Sailing with someone?</div>
                <div className="mt-0.5 text-xs leading-tight text-muted-2">Invite them to the group chat</div>
              </div>
              <ShareInviteButton
                url={shareUrl}
                title="Join me on SameSailing.com"
                text={`Join me on ${sailingLine ?? "SameSailing"} - let's connect before we board!`}
                label="Invite"
                className="flex min-h-[44px] shrink-0 items-center rounded-[10px] border-[1.5px] border-[#cfe6e8] bg-[#f2fafb] px-[13px] font-sans text-[13px] font-extrabold text-teal-dark"
              />
            </div>
          ) : null}

          <div className="mt-3.5 text-[12.5px] font-semibold text-muted-2">
            Add a photo and interests in{" "}
            <Link href="/profile" className="font-bold text-teal">
              Profile
            </Link>{" "}
            so people recognise you
          </div>
        </>
      ) : (
        <button type="button" className={primaryButtonClass + " mt-0"} onClick={onGoToDashboard}>
          Go to my dashboard →
        </button>
      )}
    </div>
  );
}

const primaryButtonClass =
  "block w-full rounded-xl bg-teal py-3.5 text-center font-sans text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-teal-dark active:scale-[.98]";
const secondaryButtonClass =
  "mt-2.5 block w-full rounded-xl border-[1.5px] border-border py-3 text-center font-sans text-sm font-semibold text-muted transition-[border-color,color,transform] duration-150 hover:border-teal hover:text-teal active:scale-[.98]";
