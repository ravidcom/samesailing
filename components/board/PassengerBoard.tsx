"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth, type PartyType } from "@/lib/auth-context";
import type { Passenger } from "@/lib/passengers";
import { matchCue, type MatchCue } from "@/lib/matchCue";
import { flagUrl } from "@/lib/countryCodes";
import PrideStripe from "@/components/ui/PrideStripe";
import Avatar from "@/components/ui/Avatar";
import { PARTY_ICON } from "@/lib/partyLabels";
import Toggle from "@/components/ui/Toggle";
import Modal from "@/components/ui/Modal";
import EditSailingProfileModal from "@/components/dashboard/EditSailingProfileModal";
import ReportModal, { type ReportTarget } from "@/components/ui/ReportModal";
import { CornerRibbon, BadgeExplainer } from "@/components/ui/PioneerBadge";
import { badgeForRank, CREW_CARD_BORDER } from "@/lib/pioneer";
import ShareInviteButton from "@/components/ui/ShareInviteButton";
import { MIN_BROWSE_THRESHOLD } from "@/lib/cruiseData";

const FILTERS: { id: "all" | PartyType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "family", label: "Families" },
  { id: "couple", label: "Couples" },
  { id: "solo", label: "Solo" },
  { id: "friends", label: "Friends" },
];

/** The LGBTQ+ toggle is a per-user preference, not per-sailing - it should
 * still be on next time you open a different sailing's board. */
function lgbtqPrefKey(userId: string) {
  return `samesailing:lgbtqOnly:${userId}`;
}
function loadLgbtqPref(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(lgbtqPrefKey(userId)) === "1";
}
function saveLgbtqPref(userId: string, value: boolean) {
  localStorage.setItem(lgbtqPrefKey(userId), value ? "1" : "0");
}

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
      {/* Name line: who they are. Party type moved to the subline below now
          that the avatar is user-chosen rather than doubling as that signal -
          the pride bar earns this line because it's the person speaking. */}
      <div className="flex items-center gap-1.5 text-[16.5px] leading-[1.2] font-bold text-charcoal">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{p.name}</span>
        {p.anon ? (
          <span className="shrink-0 rounded-full bg-[#f2f7f7] px-1.5 py-0.5 text-[9.5px] font-bold tracking-[.05em] text-[#9db4b7] uppercase">
            Anon
          </span>
        ) : null}
        {p.lgbtq ? (
          <span title="LGBTQ+ member" className="shrink-0">
            <PrideStripe className="h-[15px] w-[23px]" outlined />
          </span>
        ) : null}
      </div>
      <div className="mt-[3px] flex items-center gap-1 text-[12.5px] leading-[1.4] text-muted-2">
        <span className="shrink-0 text-[13px] leading-none">{PARTY_ICON[p.t]}</span>
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
  shipName,
  dateLabel,
  passengers,
}: {
  sailingId: string;
  shipName: string;
  dateLabel: string;
  passengers: Passenger[];
}) {
  const { loggedIn, userId, mySailings } = useAuth();
  const [filter, setFilter] = useState<"all" | PartyType>("all");
  const [lgbtqOnly, setLgbtqOnlyState] = useState(false);
  // Render-time sync (not an effect) - safe because lgbtqOnly is this
  // component's own local state, same pattern as ChatApp's read-map load.
  const [lgbtqLoadedForUser, setLgbtqLoadedForUser] = useState<string | null>(null);
  if (userId && userId !== lgbtqLoadedForUser) {
    setLgbtqLoadedForUser(userId);
    setLgbtqOnlyState(loadLgbtqPref(userId));
  }
  function setLgbtqOnly(value: boolean) {
    setLgbtqOnlyState(value);
    if (userId) saveLgbtqPref(userId, value);
  }
  const [profileSheetId, setProfileSheetId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [openBadgeId, setOpenBadgeId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const hasJoined = mySailings.some((s) => s.id === sailingId);
  const mySailing = mySailings.find((s) => s.id === sailingId);

  const fullList = useMemo(() => {
    const mine = passengers.find((p) => p.id === userId);
    if (!mine) return passengers;
    return [mine, ...passengers.filter((p) => p.id !== userId)];
  }, [passengers, userId]);

  const me = fullList.find((p) => p.id === userId) ?? null;
  // Chip counts reflect the LGBTQ+ toggle (so a chip's count always matches
  // what tapping it produces); the toggle's own "N aboard" reflects the
  // active party-type chip instead, so the two controls stay consistent
  // with each other in both directions.
  const lgbtqScoped = fullList.filter((p) => !lgbtqOnly || p.lgbtq);
  const partyScoped = fullList.filter((p) => filter === "all" || p.t === filter);
  const countFor = (id: "all" | PartyType) =>
    id === "all" ? lgbtqScoped.length : lgbtqScoped.filter((p) => p.t === id).length;
  const lgbtqAboardCount = partyScoped.filter((p) => p.lgbtq).length;
  // Badged travelers (join ranks 1-10) sort above everyone else, in join
  // order; unbadged passengers keep their existing relative order.
  const list = lgbtqScoped
    .filter((p) => filter === "all" || p.t === filter)
    .sort((a, b) => {
      if (a.joinRank && b.joinRank) return a.joinRank - b.joinRank;
      if (a.joinRank) return -1;
      if (b.joinRank) return 1;
      return 0;
    });
  const sheetPassenger = fullList.find((p) => p.id === profileSheetId) ?? null;

  // "All" always leads; the four party types after it sort by count (most
  // first) so whichever ones actually have people aboard aren't buried past
  // several zero-count, disabled chips.
  const [allFilter, ...partyFilters] = FILTERS;
  const orderedFilters = [allFilter, ...[...partyFilters].sort((a, b) => countFor(b.id) - countFor(a.id))];

  function openEditFromSheet() {
    setProfileSheetId(null);
    setEditOpen(true);
  }

  return (
    <>
      <div className="sticky top-[62px] z-[90] border-b border-border bg-[#eef7f7] px-4 sm:px-8 md:px-12">
        <div className="mx-auto max-w-[1000px]">
          <div className="relative">
            <div className="flex items-center gap-1.75 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {orderedFilters.map((f) => {
                const count = countFor(f.id);
                const active = filter === f.id;
                const disabled = count === 0 && !active;
                return (
                  <button
                    key={f.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setFilter(f.id)}
                    className={`shrink-0 rounded-full border-[1.5px] px-3.5 py-1.5 font-sans text-[13px] font-semibold transition-all ${
                      active
                        ? "border-teal bg-teal text-white"
                        : disabled
                          ? "cursor-not-allowed border-[#e6f0f0] bg-[#f7fafa] text-[#c3d6d8]"
                          : "border-border bg-white text-muted hover:border-teal hover:bg-teal hover:text-white"
                    }`}
                  >
                    {f.label} <span className={active ? "opacity-70" : "text-[#9db4b7]"}>{count}</span>
                  </button>
                );
              })}
            </div>
            {/* Fades the scrollable row's right edge instead of showing a
                scrollbar track, which reads as broken on desktop. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-[#eef7f7] to-transparent"
            />
          </div>

          <div className="flex items-center gap-2.5 pb-3">
            <PrideStripe className="h-3.5 w-5 shrink-0" />
            <span className="font-sans text-[13px] font-semibold text-muted">
              LGBTQ+ Member <span className="font-medium text-[#9db4b7]">· {lgbtqAboardCount} aboard</span>
            </span>
            <Toggle on={lgbtqOnly} onChange={() => setLgbtqOnly(!lgbtqOnly)} />
          </div>
        </div>
      </div>

      <div className="px-4 py-7 sm:px-8 md:px-12">
        <div className="mx-auto max-w-[1000px]">
          {fullList.length < MIN_BROWSE_THRESHOLD ? (
            <div className="mb-5 rounded-[16px] border-[1.5px] border-dashed border-teal-shadow bg-teal-tint px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="mb-3 sm:mb-0">
                <div className="text-sm font-bold text-charcoal">You&apos;re one of the first aboard</div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Know someone else on {shipName}? Invite them so the board doesn&apos;t feel so quiet.
                </p>
              </div>
              <ShareInviteButton
                url={`https://samesailing.com/sailing/${sailingId}`}
                title="Join me on SameSailing.com"
                text={`Join me on ${shipName} · ${dateLabel} - let's connect before we board!`}
                label="Invite a traveler"
                className="shrink-0 rounded-[11px] border-none bg-teal px-4 py-2.5 font-sans text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-teal-dark"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-[11px] sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const isMe = p.id === userId;
              const cue = isMe ? { text: "This is how others see you", hasMatch: false } : matchCue(me, p);
              const badge = badgeForRank(p.joinRank);
              const frameColor = badge ? (badge.tier === "crew" ? CREW_CARD_BORDER : badge.frame) : undefined;

              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setProfileSheetId(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setProfileSheetId(p.id);
                  }}
                  style={badge ? { borderTop: `3px solid ${frameColor}` } : undefined}
                  className="relative cursor-pointer overflow-hidden rounded-[20px] border border-[#e3efef] bg-white p-[17px] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(42,32,28,.1)]"
                >
                  {badge ? (
                    <CornerRibbon
                      badge={badge}
                      onToggle={(e) => {
                        e.stopPropagation();
                        setOpenBadgeId((id) => (id === p.id ? null : p.id));
                      }}
                    />
                  ) : null}
                  <div className={`flex items-center gap-3 ${badge ? "mt-4" : ""}`}>
                    <div
                      className="shrink-0 rounded-full"
                      style={{
                        boxShadow:
                          badge && badge.tier !== "crew"
                            ? `0 0 0 2.5px ${badge.frame}`
                            : "0 0 0 2px #fff, 0 0 0 3px #e7f1f2",
                      }}
                    >
                      <Avatar emoji={p.avatarEmoji} tint={p.avatarTint} size={48} />
                    </div>
                    <div className="min-w-0 flex-1" style={badge ? { paddingRight: badge.cardPaddingRightPx } : undefined}>
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

                  {badge ? <BadgeExplainer badge={badge} show={openBadgeId === p.id} /> : null}

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
              <div className="shrink-0 rounded-full" style={{ boxShadow: "0 0 0 2px #fff, 0 0 0 3px #e7f1f2" }}>
                <Avatar emoji={sheetPassenger.avatarEmoji} tint={sheetPassenger.avatarTint} size={48} />
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
                <>
                  <Link
                    href={loggedIn && hasJoined ? `/chat?with=${sheetPassenger.id}&sailing=${sailingId}` : `/join/${sailingId}`}
                    className="block w-full rounded-[11px] bg-teal py-2.5 text-center font-sans text-[13px] font-semibold text-white transition-colors hover:bg-teal-dark"
                  >
                    ✉ Send private message
                  </Link>
                  {loggedIn ? (
                    <button
                      type="button"
                      onClick={() =>
                        setReportTarget({ userId: sheetPassenger.id, label: sheetPassenger.name, sailingId })
                      }
                      className="mt-2.5 block w-full text-center font-sans text-xs text-muted-2 hover:text-coral"
                    >
                      🚩 Report this passenger
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {mySailing ? (
        <EditSailingProfileModal sailing={mySailing} open={editOpen} onClose={() => setEditOpen(false)} />
      ) : null}

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />
    </>
  );
}
