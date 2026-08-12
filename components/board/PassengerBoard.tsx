"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth, type PartyType } from "@/lib/auth-context";
import type { Passenger } from "@/lib/passengers";
import { flagUrl } from "@/lib/countryCodes";
import PrideStripe from "@/components/ui/PrideStripe";

const FILTERS: { id: "all" | PartyType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "family", label: "Families" },
  { id: "couple", label: "Couples" },
  { id: "solo", label: "Solo" },
  { id: "friends", label: "Friends" },
];

function overlapCue(cue: string, myGoals: string[], theirGoals: string[]) {
  const shared = myGoals.filter((g) => theirGoals.includes(g));
  if (shared.length >= 2) return `You both want ${shared.slice(0, 2).join(" & ")}`;
  if (shared.length === 1) return `You both want ${shared[0]}`;
  return cue;
}

export default function PassengerBoard({
  sailingId,
  passengers,
}: {
  sailingId: string;
  passengers: Passenger[];
}) {
  const { loggedIn, userId, mySailings } = useAuth();
  const [filter, setFilter] = useState<"all" | PartyType>("all");
  const [lgbtqOnly, setLgbtqOnly] = useState(false);
  const hasJoined = mySailings.some((s) => s.id === sailingId);

  const fullList = useMemo(() => {
    const mine = passengers.find((p) => p.id === userId);
    if (!mine) return passengers;
    return [mine, ...passengers.filter((p) => p.id !== userId)];
  }, [passengers, userId]);

  const myGoals = fullList.find((p) => p.id === userId)?.goals ?? [];
  const list = fullList
    .filter((p) => filter === "all" || p.t === filter)
    .filter((p) => !lgbtqOnly || p.lgbtq);
  const filtered = filter !== "all" || lgbtqOnly;

  return (
    <>
      <div className="sticky top-[62px] z-[90] border-b border-border bg-[#eef7f7] px-4 py-3 sm:px-8 md:px-12">
        <div className="mx-auto flex max-w-[1000px] items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-[11px] font-semibold tracking-[.08em] text-muted-2 uppercase">
            Who
          </span>
          <div className="h-5.5 w-px shrink-0 bg-border" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border-[1.5px] px-4 py-1.5 font-sans text-[13px] font-medium transition-all ${
                filter === f.id
                  ? "border-teal bg-teal text-white"
                  : "border-border bg-white text-muted hover:border-teal hover:bg-teal hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="h-5.5 w-px shrink-0 bg-border" />
          <button
            type="button"
            onClick={() => setLgbtqOnly((v) => !v)}
            aria-pressed={lgbtqOnly}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-4 py-1.5 font-sans text-[13px] font-medium transition-all ${
              lgbtqOnly
                ? "border-teal bg-teal text-white"
                : "border-border bg-white text-muted hover:border-teal hover:bg-teal hover:text-white"
            }`}
          >
            <PrideStripe />
            LGBTQ+
          </button>
        </div>
      </div>

      <div className="px-4 py-7 sm:px-8 md:px-12">
        <div className="mx-auto max-w-[1000px]">
          <div className="mb-3 text-xs font-semibold text-muted-2">
            {filtered
              ? `${list.length} of ${fullList.length} travelers`
              : `${fullList.length} traveler${fullList.length === 1 ? "" : "s"} aboard`}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const isMe = p.id === userId;
              const smartCue = !isMe && myGoals.length ? overlapCue(p.cue, myGoals, p.goals) : p.cue;
              const flag = p.country ? flagUrl(p.country) : null;
              const subParts = [
                p.country ? p.country : "",
                p.langs.length ? `speaks ${p.langs.join(", ")}` : "",
              ].filter(Boolean);

              return (
                <div
                  key={p.id}
                  className="flex flex-col rounded-[20px] border-[1.5px] border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(42,32,28,.1)]"
                >
                  <div className="mb-3.5 flex items-center gap-3">
                    <div
                      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-[22px]"
                      style={{ background: p.avBg }}
                    >
                      {p.av}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-charcoal">
                        {p.who}
                        {isMe ? " (you)" : ""}
                        {p.lgbtq ? (
                          <span className="ml-1 inline-flex" title="LGBTQ+ community">
                            <PrideStripe />
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-2">
                        {flag ? (
                          <Image src={flag} alt="" width={16} height={12} className="rounded-[2px]" unoptimized />
                        ) : null}
                        {subParts.join(" · ")}
                      </div>
                    </div>
                  </div>

                  {p.sub ? <div className="mb-2 text-xs leading-relaxed text-[#5f8288]">{p.sub}</div> : null}

                  <div className="mb-3 flex items-start gap-1.5 rounded-[11px] border border-[#c6e3d3] bg-[#e6f3ec] px-2.5 py-2 text-xs font-bold leading-tight text-[#2f8f6b]">
                    ✦ {smartCue}
                  </div>

                  {p.goals.length ? (
                    <>
                      <div className="mb-1.5 text-[10px] font-semibold tracking-[.06em] text-muted-2 uppercase">
                        Looking for
                      </div>
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {p.goals.map((g) => (
                          <span
                            key={g}
                            className="rounded-full bg-teal-tint px-2.5 py-1 text-[11px] font-medium text-teal"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {isMe ? null : loggedIn && hasJoined ? (
                    <div className="mt-auto">
                      <Link
                        href={`/chat?with=${p.id}&sailing=${sailingId}`}
                        className="block w-full rounded-[11px] bg-teal py-2.5 text-center font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
                      >
                        ✉ Send private message
                      </Link>
                      <div className="mt-1.5 text-center text-[11px] text-muted-2">
                        Opens your sailing&apos;s messages
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/join/${sailingId}`}
                      className="mt-auto block w-full rounded-[11px] bg-teal py-2.5 text-center font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
                    >
                      Join to message
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          {!loggedIn ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-[20px] border-[1.5px] border-[#9bd9e3] bg-linear-to-br from-[#eaf7f9] to-[#d4eef2] px-7 py-6">
              <div>
                <div className="mb-1 font-display text-lg font-bold text-charcoal">
                  Join this sailing to chat
                </div>
                <div className="text-sm leading-relaxed text-muted">
                  Register your profile to access the group chat and send private
                  messages. Your contact details are never shared.
                </div>
              </div>
              <Link
                href={`/join/${sailingId}`}
                className="whitespace-nowrap rounded-[11px] bg-teal px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
              >
                Join this sailing →
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
