import { primaryButton } from "@/lib/formStyles";

type Props = {
  sailingLabel: string | null;
  onGoToDashboard: () => void;
};

export default function StepSuccess({ sailingLabel, onGoToDashboard }: Props) {
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
      <button type="button" className={primaryButton + " mt-0"} onClick={onGoToDashboard}>
        Go to my dashboard →
      </button>
    </div>
  );
}
