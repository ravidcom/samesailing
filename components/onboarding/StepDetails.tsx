"use client";

import { GOALS } from "@/lib/goals";
import type { StepProps } from "./types";
import { fieldLabel, primaryButton, backLink, errorText } from "@/lib/formStyles";
import Toggle from "@/components/ui/Toggle";
import PrideStripe from "@/components/ui/PrideStripe";
import CountrySelect from "@/components/ui/CountrySelect";

type Props = StepProps & {
  onContinue: () => void;
  onBack: () => void;
  continueLabel?: string;
  /** Country is set once at signup and carried into every sailing after
   * that (see OnboardingWizard/EditSailingProfileModal) - a returning
   * traveler sees it as a fixed fact here, not a field to fill in again. */
  loggedIn: boolean;
};

export default function StepDetails({ data, update, error, onContinue, onBack, continueLabel, loggedIn }: Props) {
  function toggleGoal(id: string) {
    const has = data.goals.includes(id);
    update({ goals: has ? data.goals.filter((g) => g !== id) : [...data.goals, id] });
  }

  return (
    <div>
      <label className={fieldLabel}>Where are you from?</label>
      {loggedIn ? (
        <div className="flex items-center gap-2 rounded-lg bg-[#f2f7f7] px-3 py-2 text-sm font-semibold text-muted-2">
          ✓ {data.country}
        </div>
      ) : (
        <CountrySelect value={data.country} onChange={(v) => update({ country: v })} />
      )}

      <label className={fieldLabel + " mt-[18px]"}>What are you looking for?</label>
      <div className="relative grid grid-flow-col grid-rows-4 grid-cols-2 gap-2 gap-x-2.5">
        {GOALS.map((g) => {
          const on = data.goals.includes(g.id);
          return (
            <div
              key={g.id}
              onClick={() => toggleGoal(g.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] px-2.5 py-2.5 transition-all ${
                on ? "border-teal bg-teal-tint shadow-[0_1px_4px_rgba(14,140,153,.14)]" : "border-border bg-input hover:border-teal hover:bg-teal-tint"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors ${
                  on ? "border-teal bg-teal" : "border-[#c5e2e4] bg-white"
                }`}
              >
                {on ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </div>
              <span className="shrink-0 text-[15px] leading-none">{g.emoji}</span>
              <span className="text-xs font-medium leading-tight text-charcoal">{g.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-[18px] flex items-center justify-between gap-3 rounded-[11px] border-[1.5px] border-border bg-input px-3.5 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-charcoal">
            <PrideStripe />
            LGBTQ+ community
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted">
            Show this on your card, let others filter for it, and unlock the
            LGBTQ+ group chat for this sailing. Optional, and only visible to
            fellow passengers on this sailing.
          </div>
        </div>
        <Toggle on={data.lgbtq} onChange={() => update({ lgbtq: !data.lgbtq })} label="LGBTQ+ community member" />
      </div>

      {error ? <div className={errorText}>{error}</div> : null}

      <button type="button" className={primaryButton} onClick={onContinue}>
        {continueLabel ?? "Continue →"}
      </button>
      <button type="button" className={backLink} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
