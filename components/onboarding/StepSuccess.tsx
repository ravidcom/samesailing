import { primaryButton } from "@/lib/formStyles";
import ShareInviteButton from "@/components/ui/ShareInviteButton";

type Props = {
  sailingLabel: string | null;
  sailingId: string | null;
  onGoToDashboard: () => void;
};

export default function StepSuccess({ sailingLabel, sailingId, onGoToDashboard }: Props) {
  const shareUrl = sailingId ? `https://samesailing.com/sailing/${sailingId}` : null;

  return (
    <div className="px-0 pt-2.5 pb-1 text-center">
      <div className="mx-auto mb-[18px] flex h-16 w-16 items-center justify-center rounded-full bg-teal-tint text-[28px]">
        ⚓
      </div>
      <div className="mb-2.5 font-display text-2xl font-bold text-charcoal">
        You&apos;re aboard!
      </div>
      {sailingLabel ? (
        <div className="mb-[18px] inline-block rounded-full border border-[#b9e5e8] bg-teal-tint px-4 py-1.5 text-xs font-semibold text-teal">
          {sailingLabel}
        </div>
      ) : null}
      <div className="mb-6 text-sm leading-relaxed text-muted">
        Your profile is now visible to fellow travelers. Jump into the group
        chat, or send a private message to anyone on your sailing.
      </div>

      {shareUrl ? (
        <div className="mb-6 rounded-[14px] border-[1.5px] border-dashed border-teal-shadow bg-teal-tint px-4 py-4">
          <div className="mb-1 text-sm font-bold text-charcoal">Know someone else on this sailing?</div>
          <p className="mb-3 text-xs leading-relaxed text-muted">
            Invite them so your group chat isn&apos;t just you.
          </p>
          <ShareInviteButton
            url={shareUrl}
            title="Join me on SameSailing.com"
            text={`Join me on ${sailingLabel} - let's connect before we board!`}
            label="Invite a fellow traveler"
            className="w-full rounded-[11px] border-none bg-teal py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          />
        </div>
      ) : null}

      <button type="button" className={primaryButton + " mt-0"} onClick={onGoToDashboard}>
        Go to my dashboard →
      </button>
    </div>
  );
}
