"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const SWIPE_THRESHOLD_PX = 50;
const MAX_DOTS = 5;

/** Sort key: the YYYY-MM-DD suffix every sailing id ends with (e.g.
 * "AP-2026-08-15" -> "2026-08-15"), which sorts correctly as a plain
 * string and avoids depending on the display date string's format. */
function dateKey(sailingId: string): string {
  return sailingId.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? sailingId;
}

function ChatBubbleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0E8C99" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.4A8 8 0 1 1 21 11.5z" />
      <circle cx="9" cy="11.5" r=".9" fill="#0E8C99" stroke="none" />
      <circle cx="12.5" cy="11.5" r=".9" fill="#0E8C99" stroke="none" />
      <circle cx="16" cy="11.5" r=".9" fill="#0E8C99" stroke="none" />
    </svg>
  );
}

function ChainLinkIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round">
      <path d="M10.6 13.4a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M13.4 10.6a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </svg>
  );
}

export default function SailingHeaderCard({
  sailingId,
  lineLabel,
  shipName,
  dateLabel,
  port,
  countdown,
}: {
  sailingId: string;
  lineLabel: string;
  shipName: string;
  dateLabel: string;
  port: string;
  countdown: string;
}) {
  const { mySailings } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const joined = mySailings.some((s) => s.id === sailingId);
  const ordered = [...mySailings].sort((a, b) => dateKey(a.id).localeCompare(dateKey(b.id)));
  const myIndex = ordered.findIndex((s) => s.id === sailingId);
  const count = ordered.length;

  function goTo(index: number) {
    const target = ordered[index];
    if (target) router.push(`/sailing/${target.id}/board`);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || !joined || count < 2) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (dx < 0) goTo(myIndex + 1);
    else goTo(myIndex - 1);
  }

  function shareSailing() {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <div
        className="overflow-hidden rounded-[20px] bg-[#0E8C99] px-4 py-4 text-white"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 text-[10.5px] font-bold tracking-[.1em] text-[#a8dbe1] uppercase">
            {lineLabel}
          </div>
          {joined ? (
            count <= 1 ? (
              <Link
                href="/join"
                className="shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-white/55 bg-white/16 px-3 py-[7px] font-sans text-xs font-bold text-white"
              >
                Add sailing ＋
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-white/55 bg-white/16 px-3 py-[7px] font-sans text-xs font-bold text-white"
              >
                Change ⇄
              </Link>
            )
          ) : null}
        </div>

        <div className="mt-0.5 font-display text-[23px] leading-[1.14] font-bold">{shipName}</div>
        <div className="mt-1.5 text-[12.5px] text-[#cfeaee]">
          {dateLabel} · from {port}
        </div>
        {countdown ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/18 px-[11px] py-[5px] text-[12.5px] font-bold">
            ⏳ {countdown}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2.5">
          {joined ? (
            <Link
              href="/chat"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-white"
            >
              <ChatBubbleIcon />
              <span className="font-display text-[16.5px] font-bold text-[#0E8C99]">Group chat</span>
            </Link>
          ) : (
            <Link
              href={`/join/${sailingId}`}
              className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-white font-display text-[16.5px] font-bold text-[#0E8C99]"
            >
              ⚓ Join this sailing
            </Link>
          )}
          <button
            type="button"
            onClick={shareSailing}
            aria-label="Share this sailing"
            className="flex h-12 w-14 shrink-0 items-center justify-center rounded-[14px] bg-white/22"
          >
            {copied ? <span className="text-xs font-bold text-white">✓</span> : <ChainLinkIcon />}
          </button>
        </div>
      </div>

      {joined && count > 1 ? (
        <div className="flex items-center justify-center gap-1.75 pt-[13px] pb-3">
          {count <= MAX_DOTS ? (
            ordered.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to sailing ${i + 1} of ${count}`}
                className={
                  i === myIndex
                    ? "h-1.5 w-5 rounded-full bg-[#0E8C99]"
                    : "h-1.5 w-1.5 rounded-full bg-[#c3d6d8]"
                }
              />
            ))
          ) : (
            <span className="text-[12.5px] font-bold text-muted-2">
              {myIndex + 1} / {count}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
