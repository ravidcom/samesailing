"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth, type PartyType } from "@/lib/auth-context";
import type { Passenger } from "@/lib/passengers";
import { matchCue, type MatchCue } from "@/lib/matchCue";
import { flagUrl } from "@/lib/countryCodes";
import PrideStripe from "@/components/ui/PrideStripe";
import Modal from "@/components/ui/Modal";
import EditSailingProfileModal from "@/components/dashboard/EditSailingProfileModal";

const FILTERS: { id: "all" | PartyType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "family", label: "Families" },
  { id: "couple", label: "Couples" },
  { id: "solo", label: "Solo" },
  { id: "friends", label: "Friends" },
];

function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6.5h16v11H8.5L4 20.5z" />
    </svg>
  );
}

function NameSubtitle({ p }: { p: Passenger }) {
  const flag = p.country ? flagUrl(p.country) : null;
  const partyAndAge = p.ageLabel ? `${p.who}, ${p.ageLabel}` : p.who;
  return (
    <>
      <div className="flex items-center gap-1.5 text-[16.5px] leading-[1.2] font-bold text-charcoal">
        {p.name}
        {p.anon ? (
          <span className="rounded-full bg-[#f2f7f7] px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.05em] text-[#9db4b7] uppercase">
            Anon
          </span>
        ) : null}
        {p.lgbtq ? (
          <span title="LGBTQ+ community">
            <PrideStripe />
          </span>
        ) : null}
      </div>
      <div className="mt-[3px] flex items-center gap-1 text-[12.5px] leading-[1.4] text-muted-2">
        <span>{partyAndAge}</span>
        {p.country ? (
          <span className="flex items-center gap-1">
            · {flag ? <Image src={flag} alt="" width={14} height={10} className="rounded-[2px]" unoptimized /> : null} {p.country}
          </span>
        ) : null}
      </div>
    </>
  );
}

function MatchLine({ cue }: { cue: MatchCue }) {
  return (
    <div
      className={`mt-3.5 flex items-start gap-2 rounded-[13px] border px-[13px] py-[11px] ${
        cue.hasMatch ? "border-[#d6ead9] bg-[#eef8f2]" : "border-[#e3efef] bg-[#f4f8f8]"
      }`}
    >
      <span className={`text-[13px] leading-[1.35] ${cue.hasMatch ? "text-[#3f8b64]" : "text-muted-2"}`}>✦</span>
      <span
        className={`min-w-0 flex-1 overflow-hidden text-[13px] leading-[1.4] font-semibold text-ellipsis whitespace-nowrap ${
          cue.hasMatch ? "text-[#2f6b4c]" : "text-muted-2"
        }`}
      >
        {cue.text}
      </span>
    </div>
  );
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
  const [profileSheetId, setProfileSheetId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const hasJoined = mySailings.some((s) => s.id === sailingId);
  const mySailing = mySailings.find((s) => s.id === sailingId);

  const fullList = useMemo(() => {
    const mine = passengers.find((p) => p.id === userId);
    if (!mine) return passengers;
    return [mine, ...passengers.filter((p) => p.id !== userId)];
  }, [passengers, userId]);

  const me = fullList.find((p) => p.id === userId) ?? null;
  const list = fullList
    .filter((p) => filter === "all" || p.t === filter)
    .filter((p) => !lgbtqOnly || p.lgbtq);
  const filtered = filter !== "all" || lgbtqOnly;
  const sheetPassenger = fullList.find((p) => p.id === profileSheetId) ?? null;

  function openEditFromSheet() {
    setProfileSheetId(null);
    setEditOpen(true);
  }

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

          <div className="grid grid-cols-1 gap-[11px] sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const isMe = p.id === userId;
              const cue = isMe ? { text: "This is how others see you", hasMatch: false } : matchCue(me, p);

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setProfileSheetId(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setProfileSheetId(p.id);
                  }}
                  className="cursor-pointer rounded-[20px] border border-[#e3efef] bg-white p-[17px] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(42,32,28,.1)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[23px]"
                      style={{ background: p.avBg }}
                    >
                      {p.av}
                    </div>
                    <div className="min-w-0 flex-1">
                      <NameSubtitle p={p} />
                    </div>
                    {isMe ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditOpen(true);
                        }}
                        aria-label="Edit my profile"
                        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-teal text-lg transition-colors hover:bg-teal-dark"
                      >
                        ✏️
                      </button>
                    ) : (
                      <Link
                        href={loggedIn && hasJoined ? `/chat?with=${p.id}&sailing=${sailingId}` : `/join/${sailingId}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Send a private message to ${p.name}`}
                        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-teal transition-colors hover:bg-teal-dark"
                      >
                        <MessageIcon />
                      </Link>
                    )}
                  </div>

                  <MatchLine cue={cue} />

                  {p.goals.length ? (
                    <div className="mt-[13px] flex flex-wrap gap-[7px]">
                      {p.goals.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-[#eaf6f7] px-3 py-1.5 text-[12.5px] font-semibold text-teal"
                        >
                          {g}
                        </span>
                      ))}
                      {p.goals.length > 2 ? (
                        <span className="rounded-full bg-[#f4f8f8] px-3 py-1.5 text-[12.5px] font-semibold text-muted-2">
                          +{p.goals.length - 2}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
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

      <Modal open={!!sheetPassenger} onClose={() => setProfileSheetId(null)}>
        {sheetPassenger ? (
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[23px]"
                style={{ background: sheetPassenger.avBg }}
              >
                {sheetPassenger.av}
              </div>
              <div className="min-w-0 flex-1">
                <NameSubtitle p={sheetPassenger} />
              </div>
            </div>

            <MatchLine
              cue={
                sheetPassenger.id === userId
                  ? { text: "This is how others see you", hasMatch: false }
                  : matchCue(me, sheetPassenger)
              }
            />

            {sheetPassenger.goals.length ? (
              <>
                <div className="mt-4 text-[10px] font-semibold tracking-[.06em] text-muted-2 uppercase">
                  Looking for
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sheetPassenger.goals.map((g) => (
                    <span key={g} className="rounded-full bg-teal-tint px-2.5 py-1 text-[11px] font-medium text-teal">
                      {g}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {sheetPassenger.bio ? (
              <p className="mt-4 text-sm leading-relaxed text-muted">{sheetPassenger.bio}</p>
            ) : null}

            <div className="mt-5">
              {sheetPassenger.id === userId ? (
                <button
                  type="button"
                  onClick={openEditFromSheet}
                  className="block w-full rounded-[11px] bg-teal py-2.5 text-center font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
                >
                  ✏️ Edit my profile
                </button>
              ) : (
                <Link
                  href={loggedIn && hasJoined ? `/chat?with=${sheetPassenger.id}&sailing=${sailingId}` : `/join/${sailingId}`}
                  className="block w-full rounded-[11px] bg-teal py-2.5 text-center font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
                >
                  ✉ Send private message
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {mySailing ? (
        <EditSailingProfileModal sailing={mySailing} open={editOpen} onClose={() => setEditOpen(false)} />
      ) : null}
    </>
  );
}
