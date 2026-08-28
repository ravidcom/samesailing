"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { sailingDateKey, shortSailingLabels } from "@/lib/sailingLabel";

const SWIPE_THRESHOLD_PX = 50;
const MAX_DOTS = 5;

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
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!shareMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareMenuOpen]);

  const joined = mySailings.some((s) => s.id === sailingId);
  const ordered = [...mySailings].sort((a, b) => sailingDateKey(a.id).localeCompare(sailingDateKey(b.id)));
  const myIndex = ordered.findIndex((s) => s.id === sailingId);
  const count = ordered.length;
  const shortLabels = shortSailingLabels(ordered);

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

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Join me on ${shipName} · ${dateLabel} — let's connect before we board!`;

  async function handleShareClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Join me on SameSailing", text: shareText, url: shareUrl });
      } catch {
        // user dismissed the native share sheet — nothing to do
      }
      return;
    }
    setShareMenuOpen((open) => !open);
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setShareMenuOpen(false);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShareMenuOpen(false);
  }

  function shareEmail() {
    window.location.href = `mailto:?subject=${encodeURIComponent(
      "Join me on my cruise!"
    )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    setShareMenuOpen(false);
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
                Change sailing ⇄
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
          <div className="relative shrink-0" ref={shareMenuRef}>
            <button
              type="button"
              onClick={handleShareClick}
              aria-label="Share this sailing"
              className="flex h-12 w-14 items-center justify-center rounded-[14px] bg-white/22"
            >
              {copied ? <span className="text-xs font-bold text-white">✓</span> : <ChainLinkIcon />}
            </button>
            {shareMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-[11px] border border-border bg-white py-1.5 text-left shadow-[0_8px_24px_rgba(0,0,0,.12)]">
                <button
                  type="button"
                  onClick={copyLink}
                  className="block w-full px-3.5 py-2 text-left font-sans text-xs text-charcoal transition-colors hover:bg-input"
                >
                  🔗 Copy link
                </button>
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="block w-full px-3.5 py-2 text-left font-sans text-xs text-charcoal transition-colors hover:bg-input"
                >
                  💬 WhatsApp
                </button>
                <button
                  type="button"
                  onClick={shareEmail}
                  className="block w-full px-3.5 py-2 text-left font-sans text-xs text-charcoal transition-colors hover:bg-input"
                >
                  ✉️ Email
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {joined && count > 1 ? (
        <>
          {/* Mobile: paired with the swipe gesture above - dots just show
              position since the ship name is already visible on the card
              you're swiping. */}
          <div className="flex items-center justify-center gap-1.75 pt-[13px] pb-3 md:hidden">
            {count <= MAX_DOTS ? (
              ordered.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to ${shortLabels.get(s.id) ?? s.shipName} (sailing ${i + 1} of ${count})`}
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

          {/* Desktop: no swipe gesture to pair with, so dots would carry no
              information - a row of named, clickable pills instead (same
              pattern as the chat sidebar's sailing switcher). */}
          <div className="hidden flex-wrap items-center justify-center gap-2 pt-[13px] pb-3 md:flex">
            {ordered.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={`rounded-full px-3.5 py-1.5 font-sans text-[12.5px] font-bold transition-colors ${
                  i === myIndex
                    ? "bg-teal text-white"
                    : "border border-border bg-white text-muted hover:border-teal hover:text-teal"
                }`}
              >
                {shortLabels.get(s.id) ?? s.shipName}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
