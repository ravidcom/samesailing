"use client";

import { useState } from "react";
import { COUNTRIES, COUNTRY_OTHER } from "@/lib/countries";
import { GOALS } from "@/lib/goals";
import type { StepProps } from "./types";
import { fieldLabel, textInput, primaryButton, backLink, errorText } from "@/lib/formStyles";
import Toggle from "@/components/ui/Toggle";

const ALL_COUNTRIES = [...COUNTRIES, COUNTRY_OTHER];

type Props = StepProps & { onContinue: () => void; onBack: () => void; continueLabel?: string };

export default function StepDetails({ data, update, error, onContinue, onBack, continueLabel }: Props) {
  const [search, setSearch] = useState("");

  const filtered = ALL_COUNTRIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );
  const listSize = search ? Math.min(Math.max(filtered.length, 2), 6) : 5;

  function toggleGoal(id: string) {
    const has = data.goals.includes(id);
    update({ goals: has ? data.goals.filter((g) => g !== id) : [...data.goals, id] });
  }

  return (
    <div>
      <label className={fieldLabel}>Where are you from?</label>
      {data.country ? (
        <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-[#dff1f2] px-3 py-2 text-sm font-semibold text-teal">
          <span>✓ {data.country}</span>
          <button
            type="button"
            onClick={() => update({ country: "" })}
            className="ml-auto bg-none text-base text-muted-2 hover:text-muted"
            aria-label="Clear country"
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <input
            className={textInput + " mb-1.5"}
            placeholder="🌍 Search country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            size={listSize}
            className="w-full cursor-pointer rounded-[11px] border-[1.5px] border-border bg-input p-1.5 font-sans text-sm text-charcoal"
            onChange={(e) => update({ country: e.target.value })}
            value=""
          >
            <option value="" disabled hidden />
            {filtered.map((c) => (
              <option key={c} value={c}>
                {c === COUNTRY_OTHER ? "🌍 Other / Not listed" : c}
              </option>
            ))}
          </select>
        </>
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
          <div className="text-sm font-semibold text-charcoal">🏳️‍🌈 LGBTQ+ community</div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted">
            Show this on your card and let others filter for it. Optional, and
            only visible to fellow passengers on this sailing.
          </div>
        </div>
        <Toggle on={data.lgbtq} onChange={() => update({ lgbtq: !data.lgbtq })} />
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
