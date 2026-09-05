import type { OnboardingProfile } from "@/lib/auth-context";
import { PARTY_LABELS, PARTY_ICON } from "@/lib/partyLabels";
import { GOALS } from "@/lib/goals";
import { primaryButton, backLink } from "@/lib/formStyles";
import PrideStripe from "@/components/ui/PrideStripe";

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  nonbinary: "Non-binary",
  other: "Prefer not to say",
};

function partyDetail(profile: OnboardingProfile): string {
  const ages = profile.ageRanges.map((a) => a.replace("-", "–")).join(", ");
  if (profile.partyType === "family") {
    const kids = profile.kids.filter((k) => k.age);
    if (kids.length === 0) return "";
    return `${kids.length} ${kids.length === 1 ? "kid" : "kids"} (${kids.map((k) => k.age).join(", ")})`;
  }
  if (profile.partyType === "solo") {
    const gender = profile.gender ? GENDER_LABELS[profile.gender] : null;
    return [ages, gender].filter(Boolean).join(" · ");
  }
  if (profile.partyType === "friends") {
    return [profile.groupSize, ages].filter(Boolean).join(" · ");
  }
  return ages;
}

/**
 * Shown when a logged-in traveler with at least one existing sailing starts
 * joining another one - most people's party/age/interests don't change
 * sailing to sailing, so this offers to carry the last profile over instead
 * of making them retype everything, while still making it easy to start
 * fresh if this trip is actually different.
 */
export default function StepReuseProfile({
  profile,
  sourceSailingLabel,
  onReuse,
  onEdit,
}: {
  profile: OnboardingProfile;
  sourceSailingLabel: string;
  onReuse: () => void;
  onEdit: () => void;
}) {
  const detail = partyDetail(profile);

  return (
    <div>
      <div className="mb-1 font-display text-[22px] font-bold text-charcoal">Use the same profile?</div>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        This is what you told us on {sourceSailingLabel}. Reuse it, or start fresh if this trip is different.
      </p>

      <div className="rounded-[14px] border-[1.5px] border-border bg-input p-4">
        <div className="flex items-center gap-2 text-[15px] font-bold text-charcoal">
          <span className="text-lg">{PARTY_ICON[profile.partyType]}</span>
          {PARTY_LABELS[profile.partyType]}
        </div>
        {detail ? <div className="mt-0.5 text-[13px] text-muted">{detail}</div> : null}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {profile.country ? (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-charcoal">
              {profile.country}
            </span>
          ) : null}
          {profile.lgbtq ? (
            <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-charcoal">
              <PrideStripe className="h-2.5 w-4" /> LGBTQ+
            </span>
          ) : null}
        </div>

        {profile.goals.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {profile.goals.map((gid) => {
              const goal = GOALS.find((g) => g.id === gid);
              return (
                <span key={gid} className="rounded-full bg-teal-tint px-2.5 py-1 text-xs font-medium text-teal">
                  {goal ? `${goal.emoji} ${goal.label}` : gid}
                </span>
              );
            })}
          </div>
        ) : null}

        {profile.bio ? <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{profile.bio}</p> : null}
      </div>

      <button type="button" className={primaryButton} onClick={onReuse}>
        ✓ Yes, use the same profile
      </button>
      <button type="button" className={backLink} onClick={onEdit}>
        ✏️ Edit before joining
      </button>
    </div>
  );
}
