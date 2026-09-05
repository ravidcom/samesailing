import type { PartyType } from "@/lib/auth-context";
import type { StepProps } from "./types";
import { fieldLabel, primaryButton, backLink, errorText } from "@/lib/formStyles";

const PARTY_OPTIONS: { t: PartyType; icon: string; label: string }[] = [
  { t: "family", icon: "👨‍👩‍👧‍👦", label: "Family with kids" },
  { t: "couple", icon: "💑", label: "Couple" },
  { t: "solo", icon: "🧑", label: "Solo traveler" },
  { t: "friends", icon: "👯", label: "Friends group" },
];

const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

const GENDER_OPTIONS = [
  { v: "male", label: "Male" },
  { v: "female", label: "Female" },
  { v: "nonbinary", label: "Non-binary" },
  { v: "other", label: "Prefer not to say" },
];

const KID_GENDERS = ["", "Boy", "Girl", "Other"];

type Props = StepProps & { onContinue: () => void; onBack: () => void };

export default function StepProfile({ data, update, error, onContinue, onBack }: Props) {
  const multiAge = data.partyType === "friends" || data.partyType === "couple";

  function selectParty(t: PartyType) {
    const patch: Partial<typeof data> = { partyType: t, ageRanges: [], gender: null };
    if (t === "family" && data.kids.length === 0) {
      patch.kids = [{ gender: "", age: "" }];
    }
    update(patch);
  }

  function toggleAge(band: string) {
    if (multiAge) {
      const has = data.ageRanges.includes(band);
      update({ ageRanges: has ? data.ageRanges.filter((a) => a !== band) : [...data.ageRanges, band] });
    } else {
      update({ ageRanges: [band] });
    }
  }

  function updateKid(i: number, patch: Partial<{ gender: string; age: string }>) {
    update({ kids: data.kids.map((k, idx) => (idx === i ? { ...k, ...patch } : k)) });
  }

  function addKid() {
    update({ kids: [...data.kids, { gender: "", age: "" }] });
  }

  function removeKid(i: number) {
    update({ kids: data.kids.filter((_, idx) => idx !== i) });
  }

  return (
    <div>
      <label className={fieldLabel}>Who&apos;s traveling with you?</label>
      <div className="grid grid-cols-2 gap-[9px]">
        {PARTY_OPTIONS.map((p) => (
          <div
            key={p.t}
            onClick={() => selectParty(p.t)}
            className={`cursor-pointer rounded-[14px] border-[1.5px] px-3 py-4 text-center transition-all ${
              data.partyType === p.t ? "border-teal bg-teal-tint" : "border-border bg-input hover:border-teal hover:bg-teal-tint"
            }`}
          >
            <div className="mb-1.5 flex min-h-[26px] items-center justify-center text-[22px]">{p.icon}</div>
            <div className="text-xs font-semibold text-charcoal">{p.label}</div>
          </div>
        ))}
      </div>

      {data.partyType === "family" ? (
        <div className="mt-4 rounded-[13px] border-[1.5px] border-border bg-input p-3.5">
          <div className="mb-2.5 text-[11px] font-semibold tracking-[.06em] text-teal uppercase">
            Kids in your group
          </div>
          {data.kids.map((k, i) => (
            <div key={i} className="mb-1.5 flex items-center gap-1.5">
              <span className="min-w-[50px] text-[11px] font-semibold text-muted-2">Child {i + 1}</span>
              <select
                className="flex-1 rounded-lg border-[1.5px] border-border bg-white p-2 font-sans text-base sm:text-xs text-charcoal"
                value={k.gender}
                onChange={(e) => updateKid(i, { gender: e.target.value })}
                aria-label={`Child ${i + 1} gender`}
              >
                {KID_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g || "Gender"}
                  </option>
                ))}
              </select>
              <select
                className="max-w-[72px] flex-1 rounded-lg border-[1.5px] border-border bg-white p-2 font-sans text-base sm:text-xs text-charcoal"
                value={k.age}
                onChange={(e) => updateKid(i, { age: e.target.value })}
                aria-label={`Child ${i + 1} age`}
              >
                <option value="">Age</option>
                {Array.from({ length: 17 }, (_, a) => String(a + 1)).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {data.kids.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeKid(i)}
                  className="bg-none text-lg text-muted-2 hover:text-muted"
                  aria-label={`Remove child ${i + 1}`}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={addKid}
            className="mt-1.5 w-full rounded-lg border-[1.5px] border-dashed border-[#c5e2e4] bg-transparent py-2 font-sans text-xs text-muted-2 transition-all hover:border-teal hover:text-teal"
          >
            + Add another child
          </button>
        </div>
      ) : null}

      {data.partyType === "couple" || data.partyType === "solo" || data.partyType === "friends" ? (
        <div className="mt-4">
          <label className={fieldLabel}>Your age range</label>
          <div className="grid grid-cols-3 gap-1.5">
            {AGE_BANDS.map((band) => (
              <div
                key={band}
                onClick={() => toggleAge(band)}
                className={`cursor-pointer rounded-[10px] border-[1.5px] px-1.5 py-2.5 text-center text-xs font-semibold transition-all ${
                  data.ageRanges.includes(band)
                    ? "border-teal bg-teal-tint text-teal"
                    : "border-border bg-input text-muted hover:border-teal hover:bg-teal-tint hover:text-teal"
                }`}
              >
                {band.replace("-", "–")}
              </div>
            ))}
          </div>
          {multiAge ? (
            <div className="mt-1.5 text-[11px] text-muted-2">
              Select all ranges that apply - you can pick more than one
            </div>
          ) : null}
          {data.ageRanges.length > 1 ? (
            <div className="mt-2 text-xs font-semibold text-teal">
              Selected: {data.ageRanges.map((a) => a.replace("-", "–")).join(", ")}
            </div>
          ) : null}

          {data.partyType === "solo" ? (
            <div className="mt-3.5">
              <label className={fieldLabel}>Your gender</label>
              <div className="grid grid-cols-3 gap-1.5">
                {GENDER_OPTIONS.map((g) => (
                  <div
                    key={g.v}
                    onClick={() => update({ gender: g.v })}
                    className={`cursor-pointer rounded-[10px] border-[1.5px] px-1.5 py-2.5 text-center text-xs font-semibold transition-all ${
                      data.gender === g.v
                        ? "border-teal bg-teal-tint text-teal"
                        : "border-border bg-input text-muted hover:border-teal hover:bg-teal-tint hover:text-teal"
                    }`}
                  >
                    {g.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {data.partyType === "friends" ? (
        <div className="mt-4">
          <label htmlFor="onboarding-group-size" className={fieldLabel}>
            Group size
          </label>
          <select
            id="onboarding-group-size"
            className="w-full rounded-[11px] border-[1.5px] border-border bg-input px-[13px] py-3 font-sans text-base sm:text-sm text-charcoal"
            value={data.groupSize}
            onChange={(e) => update({ groupSize: e.target.value })}
          >
            {["2 people", "3", "4", "5", "6+"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {data.partyType ? (
        <div className="mt-4">
          <label htmlFor="onboarding-bio" className={fieldLabel}>
            Tell others about yourself{" "}
            <span className="text-[11px] font-normal tracking-normal text-muted-2 normal-case">
              (optional)
            </span>
          </label>
          <div className="relative">
            <textarea
              id="onboarding-bio"
              maxLength={80}
              rows={2}
              placeholder="e.g. Foodies exploring local flavours, first Caribbean cruise..."
              value={data.bio}
              onChange={(e) => update({ bio: e.target.value })}
              className="w-full resize-none rounded-[11px] border-[1.5px] border-border bg-input px-[13px] py-[11px] font-sans text-[16px] sm:text-[13px] text-charcoal transition-colors focus:border-teal"
            />
            <div className="absolute bottom-2 right-2.5 text-[10px] text-muted-2">
              {data.bio.length}/80
            </div>
          </div>
          <div className="mt-1 text-[11px] text-muted-2">
            This appears on your profile card in place of the default description.
          </div>
        </div>
      ) : null}

      {error ? <div className={errorText}>{error}</div> : null}

      <button type="button" className={primaryButton} onClick={onContinue}>
        Continue →
      </button>
      <button type="button" className={backLink} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
