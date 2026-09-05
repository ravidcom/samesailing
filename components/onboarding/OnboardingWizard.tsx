"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type NewSailingJoin, type PartyType } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { SailingInfo } from "@/lib/cruiseData";
import { primaryButton, backLink } from "@/lib/formStyles";
import { emptyFormData, type OnboardingFormData } from "./types";
import StepAccount from "./StepAccount";
import StepReuseProfile from "./StepReuseProfile";
import StepProfile from "./StepProfile";
import StepDetails from "./StepDetails";
import StepConsent from "./StepConsent";
import StepSuccess from "./StepSuccess";

const TTLS = [
  "Create your account",
  "Your travel party",
  "Where you're from & interests",
  "Notifications & privacy",
  "",
];

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

function emailValid(email: string) {
  return /^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/.test(email);
}

export default function OnboardingWizard({ sailing }: { sailing: SailingInfo | null }) {
  const router = useRouter();
  const auth = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingFormData>(emptyFormData);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepInitialized, setStepInitialized] = useState(false);
  const [reuseChoiceMade, setReuseChoiceMade] = useState(false);

  // Adjust the starting step once auth finishes loading (render-time state sync,
  // not an effect, since it only needs to happen once auth.loading first flips).
  if (!auth.loading && !stepInitialized) {
    setStepInitialized(true);
    if (auth.loggedIn && sailing) {
      setStep(2);
    }
  }

  useEffect(() => {
    if (!auth.loading && auth.loggedIn && !sailing) {
      router.push("/dashboard");
    }
  }, [auth.loading, auth.loggedIn, sailing, router]);

  // Steps swap content in place (no real navigation), so the browser keeps
  // whatever scroll position the previous step was left at — without this,
  // advancing from a step you'd scrolled down on lands the next step
  // mid-page instead of at its top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  function update(patch: Partial<OnboardingFormData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  function validate(s: number): string {
    if (s === 1) {
      const name = data.name.trim();
      const email = data.email.trim();
      if (!name || !email || !data.password) {
        return "Please complete all fields (password min 8 chars).";
      }
      if (!emailValid(email)) return "Please enter a valid email address.";
      if (data.password.length < 8) return "Password must be at least 8 characters.";
      return "";
    }
    if (s === 2) return data.partyType ? "" : "Please select your party type.";
    if (s === 3)
      return data.country && data.goals.length > 0
        ? ""
        : "Please select your country and at least one goal.";
    if (s === 4)
      return data.agreedTerms
        ? ""
        : "You must confirm you're 18+ and agree to the Terms of Use and Privacy Policy to continue.";
    return "";
  }

  function goNext(next: number) {
    const err = validate(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep(next);
  }

  function goBack(prev: number) {
    if (prev === 1 && auth.loggedIn) {
      router.push("/dashboard");
      return;
    }
    setError("");
    setStep(prev);
  }

  async function socialAuth(provider: "google" | "facebook") {
    setError("");
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (sailing) redirectTo.searchParams.set("join", sailing.id);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });
    if (oauthError) setError(oauthError.message);
  }

  function buildJoinedSailing(): NewSailingJoin | null {
    if (!sailing) return null;
    const partyType = data.partyType as PartyType;
    const avatar = partyType === "solo" ? soloIcon(data.gender) : PARTY_AVATARS[partyType] ?? "🧑";
    return {
      id: sailing.id,
      line: sailing.line,
      shipName: sailing.shipName,
      date: sailing.date,
      itinerary: sailing.itinerary,
      port: sailing.port,
      profile: {
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
      },
    };
  }

  async function finish() {
    const err = validate(4);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setSubmitting(true);

    const joinedSailing = buildJoinedSailing();

    if (auth.loggedIn) {
      const result = joinedSailing ? await auth.joinSailing(joinedSailing) : {};
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStep(5);
      return;
    }

    const partyType = data.partyType as PartyType;
    const avatar = partyType === "solo" ? soloIcon(data.gender) : PARTY_AVATARS[partyType] ?? "🧑";
    const result = await auth.completeSignUp({
      name: data.name || "Traveler",
      email: data.email,
      password: data.password,
      avatar,
      country: data.country,
      sailing: joinedSailing,
      nameMode: data.nameMode,
      nickname: data.nickname.trim(),
    });
    setSubmitting(false);
    if (result.error) {
      setError(
        /already registered/i.test(result.error)
          ? "An account with this email already exists. Go back to step 1 and use “Sign in” instead, or use a different email."
          : result.error
      );
      return;
    }
    setStep(5);
  }

  const sailingLabel = sailing ? `${sailing.shipName} · ${sailing.date}` : null;

  // Party type / age / gender / country / goals (steps 2-3) are per-sailing
  // profile fields (they end up in joined_sailings.profile) - with no
  // sailing picked yet, there's nowhere for that data to go, so asking for
  // it would just be discarded and re-asked the moment they actually join
  // one. Skip straight from account creation to consent in that case.
  const totalSteps = sailing ? 4 : 2;
  const displayStep = sailing || step !== 4 ? step : 2;

  // Already a member of this sailing - joining again would just overwrite
  // the existing profile row, so stop before the wizard rather than making
  // someone fill out four steps only to be told "already joined" at the end.
  // Gated to step < 5: a successful finish() also lands the just-joined
  // sailing in mySailings, which would otherwise make this check fire on
  // step 5 too and hijack the real success screen for every completed join.
  const alreadyJoined =
    step < 5 && auth.loggedIn && sailing && auth.mySailings.some((s) => s.id === sailing.id);
  if (alreadyJoined) {
    return (
      <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white px-[30px] py-10 text-center shadow-[0_20px_50px_rgba(42,32,28,.08)]">
        <div className="mx-auto mb-[18px] flex h-16 w-16 items-center justify-center rounded-full bg-teal-tint text-[28px]">
          ⚓
        </div>
        <div className="mb-2.5 font-display text-2xl font-bold text-charcoal">
          You&apos;ve already joined this sailing
        </div>
        {sailingLabel ? (
          <div className="mb-6 inline-block rounded-full border border-[#b9e5e8] bg-teal-tint px-4 py-1.5 text-xs font-semibold text-teal">
            {sailingLabel}
          </div>
        ) : null}
        <Link href={`/sailing/${sailing.id}/board`} className={primaryButton + " block text-center"}>
          View the passenger board →
        </Link>
        <Link href="/dashboard" className={backLink + " block text-center"}>
          Go to my dashboard
        </Link>
      </div>
    );
  }

  // Already registered and joining an additional sailing - most travelers'
  // party/age/interests don't change trip to trip, so offer to carry their
  // most recently joined sailing's profile over instead of making them
  // retype all of step 2-3 from scratch. Only relevant right as they'd
  // otherwise land on step 2 - once they've chosen (either way), the normal
  // wizard takes over for the rest of the flow, back-navigation included.
  const previousSailing = auth.loggedIn ? auth.mySailings[0] : null;
  const previousProfile = previousSailing?.profile ?? null;
  if (step === 2 && sailing && previousSailing && previousProfile && !reuseChoiceMade) {
    function applyPreviousProfile() {
      if (!previousProfile) return;
      update({
        partyType: previousProfile.partyType,
        ageRanges: previousProfile.ageRanges,
        gender: previousProfile.gender,
        kids: previousProfile.kids,
        groupSize: previousProfile.groupSize,
        bio: previousProfile.bio,
        country: previousProfile.country,
        goals: previousProfile.goals,
        lgbtq: previousProfile.lgbtq,
      });
    }
    return (
      <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white px-[30px] py-8 shadow-[0_20px_50px_rgba(42,32,28,.08)]">
        <StepReuseProfile
          profile={previousProfile}
          sourceSailingLabel={`${previousSailing.shipName} · ${previousSailing.date}`}
          onReuse={() => {
            applyPreviousProfile();
            setReuseChoiceMade(true);
            setStep(4);
          }}
          onEdit={() => {
            applyPreviousProfile();
            setReuseChoiceMade(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-[22px] border-[1.5px] border-border bg-white shadow-[0_20px_50px_rgba(42,32,28,.08)]">
      <div className="border-b border-border bg-input px-[30px] pb-[22px] pt-6">
        <div className="mb-[18px] flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < displayStep ? "bg-teal" : i === displayStep ? "bg-teal/50" : "bg-border"
              }`}
            />
          ))}
        </div>
        {step <= 4 ? (
          <>
            <div className="mb-1 text-xs font-semibold tracking-[.04em] text-teal">
              Step {displayStep} of {totalSteps}
            </div>
            <div className="font-display text-[22px] font-bold text-charcoal">
              {TTLS[step - 1]}
            </div>
          </>
        ) : null}
        {sailing && step <= 4 ? (
          <div className="mt-1.5 text-xs text-muted-2">
            Joining {sailing.shipName} · {sailing.date}
          </div>
        ) : null}
      </div>

      <div className="px-[30px] pb-[30px] pt-[26px]">
        {step === 1 ? (
          <StepAccount
            data={data}
            update={update}
            error={error}
            onContinue={() => goNext(sailing ? 2 : 4)}
            onSocialAuth={socialAuth}
          />
        ) : null}
        {step === 2 ? (
          <StepProfile data={data} update={update} error={error} onContinue={() => goNext(3)} onBack={() => goBack(1)} />
        ) : null}
        {step === 3 ? (
          <StepDetails data={data} update={update} error={error} onContinue={() => goNext(4)} onBack={() => goBack(2)} />
        ) : null}
        {step === 4 ? (
          <StepConsent
            data={data}
            update={update}
            error={error}
            onFinish={finish}
            onBack={() => goBack(sailing ? 3 : 1)}
            submitting={submitting}
            loggedIn={auth.loggedIn}
            hasSailing={!!sailing}
          />
        ) : null}
        {step === 5 ? (
          <StepSuccess
            sailingLabel={sailingLabel}
            sailingId={sailing?.id ?? null}
            onGoToDashboard={() => router.push("/dashboard")}
          />
        ) : null}
      </div>
    </div>
  );
}
