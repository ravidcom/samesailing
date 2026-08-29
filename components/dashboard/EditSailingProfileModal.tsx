"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import StepProfile from "@/components/onboarding/StepProfile";
import StepDetails from "@/components/onboarding/StepDetails";
import { emptyFormData, type OnboardingFormData } from "@/components/onboarding/types";
import { useAuth, type JoinedSailing, type PartyType } from "@/lib/auth-context";

const PARTY_AVATARS: Record<PartyType, string> = {
  family: "👨‍👩‍👧‍👦",
  couple: "💑",
  solo: "🧑",
  friends: "👯",
};

function soloIcon(gender: string | null) {
  if (gender === "male") return "👨";
  if (gender === "female") return "👩";
  return "🧑";
}

function profileToFormData(sailing: JoinedSailing): OnboardingFormData {
  const p = sailing.profile;
  if (!p) return emptyFormData;
  return {
    ...emptyFormData,
    partyType: p.partyType,
    ageRanges: p.ageRanges,
    gender: p.gender,
    kids: p.kids,
    groupSize: p.groupSize,
    bio: p.bio,
    country: p.country,
    goals: p.goals,
    lgbtq: p.lgbtq,
  };
}

export default function EditSailingProfileModal({
  sailing,
  open,
  onClose,
}: {
  sailing: JoinedSailing;
  open: boolean;
  onClose: () => void;
}) {
  const { updateSailingProfile } = useAuth();
  const [page, setPage] = useState<1 | 2>(1);
  const [data, setData] = useState<OnboardingFormData>(() => profileToFormData(sailing));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(patch: Partial<OnboardingFormData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function reset() {
    setData(profileToFormData(sailing));
    setPage(1);
    setError("");
  }

  function close() {
    reset();
    onClose();
  }

  function goToDetails() {
    if (!data.partyType) {
      setError("Please select your party type.");
      return;
    }
    setError("");
    setPage(2);
  }

  async function save() {
    if (!data.country || data.goals.length === 0) {
      setError("Please select your country and at least one goal.");
      return;
    }
    setError("");
    setSubmitting(true);
    const partyType = data.partyType as PartyType;
    const avatar = partyType === "solo" ? soloIcon(data.gender) : PARTY_AVATARS[partyType] ?? "🧑";
    const result = await updateSailingProfile(sailing.id, {
      partyType,
      ageRanges: data.ageRanges,
      gender: data.gender,
      kids: data.kids,
      groupSize: data.groupSize,
      bio: data.bio.trim(),
      country: data.country,
      goals: data.goals,
      lgbtq: data.lgbtq,
      avatar,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    close();
  }

  return (
    <Modal open={open} onClose={close}>
      <div className="mb-1 font-display text-lg font-bold text-charcoal">
        Edit your profile for this sailing
      </div>
      <div className="mb-4 text-xs text-muted-2">
        {sailing.shipName} · {sailing.date}. These details can differ per sailing.
      </div>

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {page === 1 ? (
          <StepProfile data={data} update={update} error={error} onContinue={goToDetails} onBack={close} />
        ) : (
          <StepDetails
            data={data}
            update={update}
            error={error}
            onContinue={save}
            onBack={() => setPage(1)}
            continueLabel={submitting ? "Saving…" : "Save changes →"}
          />
        )}
      </div>
    </Modal>
  );
}
