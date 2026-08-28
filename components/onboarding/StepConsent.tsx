import type { ReactNode } from "react";
import type { StepProps } from "./types";
import NameModePicker from "@/components/NameModePicker";
import { fieldLabel, primaryButton, backLink, errorText } from "@/lib/formStyles";

type Props = StepProps & {
  onFinish: () => void;
  onBack: () => void;
  submitting?: boolean;
  loggedIn: boolean;
  hasSailing: boolean;
};

function OptRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div onClick={onToggle} className="mt-3 flex cursor-pointer items-start gap-2.5">
      <div
        className={`mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-[10px] font-bold transition-all ${
          checked ? "border-teal bg-teal text-white" : "border-[#c5e2e4] text-transparent"
        }`}
      >
        ✓
      </div>
      <span className="text-xs leading-relaxed text-muted">{children}</span>
    </div>
  );
}

export default function StepConsent({ data, update, error, onFinish, onBack, submitting, loggedIn, hasSailing }: Props) {
  return (
    <div>
      <div className="rounded-[11px] border-[1.5px] border-l-[3px] border-border border-l-teal bg-input px-3.5 py-3 text-xs leading-relaxed text-muted">
        🔒 Your email address is never visible to other users. All communication
        happens through SameSailing.com&apos;s chat - no contact details are ever
        exchanged.
      </div>

      {!loggedIn ? (
        <>
          <label className={fieldLabel + " mb-2 mt-[18px]"}>How you appear to other passengers</label>
          <p className="mb-2.5 text-xs leading-relaxed text-muted">
            This appears on your sailing&apos;s passenger board, which is publicly viewable - your real name is never shown unless you choose to share it.
          </p>
          <NameModePicker
            mode={data.nameMode}
            onModeChange={(m) => update({ nameMode: m })}
            nickname={data.nickname}
            onNicknameChange={(v) => update({ nickname: v })}
            firstName={data.name}
          />
        </>
      ) : null}

      <label className={fieldLabel + " mb-2 mt-[18px]"}>Email notifications</label>
      <OptRow checked={data.notifyActivity} onToggle={() => update({ notifyActivity: !data.notifyActivity })}>
        Keep me updated - notify me of new group activity and private messages on my sailing.
      </OptRow>

      <label className={fieldLabel + " mt-[18px]"}>Personalised recommendations</label>
      <OptRow checked={data.notifyRecs} onToggle={() => update({ notifyRecs: !data.notifyRecs })}>
        🎁 I&apos;d love to receive personalised recommendations for my sailing - great
        deals on hotels at my departure port, top-rated shore excursions, and
        exclusive perks for community members.
      </OptRow>

      <label className={fieldLabel + " mt-[18px]"}>
        Terms &amp; conditions <span className="font-semibold text-teal normal-case tracking-normal">Required</span>
      </label>
      <OptRow checked={data.agreedTerms} onToggle={() => update({ agreedTerms: !data.agreedTerms })}>
        I confirm I am 18 years of age or older, and I have read and agree to
        SameSailing.com&apos;s <span className="font-semibold text-teal">Terms of Use</span>{" "}
        and <span className="font-semibold text-teal">Privacy Policy</span>, including
        how my data is used to match me with fellow travelers on my sailing.
      </OptRow>

      {error ? <div className={errorText}>{error}</div> : null}

      <button
        type="button"
        className={primaryButton + (submitting ? " cursor-not-allowed opacity-70" : "")}
        onClick={onFinish}
        disabled={submitting}
      >
        {submitting ? "Joining…" : hasSailing ? "Join my sailing →" : "Create my account →"}
      </button>
      <button type="button" className={backLink} onClick={onBack} disabled={submitting}>
        ← Back
      </button>
    </div>
  );
}
