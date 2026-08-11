"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, type JoinedSailing } from "@/lib/auth-context";
import { daysUntilDate } from "@/lib/dateMath";
import { sceneFor } from "@/lib/scenes";
import { useTravelerCount } from "@/lib/useTravelerCount";
import EditSailingProfileModal from "./EditSailingProfileModal";

export default function SailingCard({ sailing }: { sailing: JoinedSailing }) {
  const { removeSailing } = useAuth();
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const days = daysUntilDate(sailing.date);
  const countLabel =
    days === null
      ? ""
      : days > 1
        ? `⏳ ${days} days to go`
        : days === 1
          ? "⏳ Tomorrow!"
          : days === 0
            ? "🚢 Departing today!"
            : "✓ Bon voyage";
  const scene = sceneFor(sailing.itinerary);
  const travelerCount = useTravelerCount(sailing.id);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/sailing/${sailing.id}/board` : "";
  const shareText = `Join me on ${sailing.shipName} · ${sailing.date} — let's connect before we board!`;

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

  async function handleInviteClick() {
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
    <div className="overflow-hidden rounded-[20px] border border-[#e4f0f1] bg-white shadow-[0_8px_24px_rgba(0,0,0,.06)]">
      <div className="relative flex h-[120px] items-end" style={{ background: scene.bg }}>
        <div className="absolute left-3.5 top-3 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold text-teal">
          {countLabel}
        </div>
        {scene.elements.map((el, i) => (
          <span
            key={i}
            className="absolute"
            style={{ ...parseInlineStyle(el.style), filter: "drop-shadow(0 2px 3px rgba(0,0,0,.15))" }}
          >
            {el.emoji}
          </span>
        ))}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[34px]"
          style={{ filter: "drop-shadow(0 3px 5px rgba(0,0,0,.18))" }}
        >
          {scene.ship}
        </span>
      </div>

      <div className="px-4.5 py-4">
        <div className="mb-1 text-xs font-semibold text-coral">
          {sailing.line} · {sailing.shipName}
        </div>
        <div className="mb-1 font-display text-[19px] font-bold text-charcoal">{sailing.date}</div>
        <div className="mb-3.5 text-[13px] text-muted">
          {sailing.itinerary} · {sailing.port}
        </div>

        <Link
          href="/chat"
          className="block w-full rounded-xl bg-teal py-3 text-center font-sans text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          💬 Open group chat
        </Link>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link
            href={`/sailing/${sailing.id}/board`}
            className="rounded-[11px] border-[1.5px] border-border py-2 text-center font-sans text-xs font-medium text-muted transition-colors hover:border-teal hover:text-teal"
          >
            🧑‍🤝‍🧑 Passengers
          </Link>
          <div className="relative" ref={shareMenuRef}>
            <button
              type="button"
              onClick={handleInviteClick}
              className="w-full rounded-[11px] border-[1.5px] border-border py-2 text-center font-sans text-xs font-medium text-muted transition-colors hover:border-teal hover:text-teal"
            >
              {copied ? "✓ Link copied" : "🔗 Invite"}
            </button>
            {shareMenuOpen ? (
              <div className="absolute right-0 top-full z-10 mt-1.5 w-44 overflow-hidden rounded-[11px] border border-border bg-white py-1.5 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
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

      <div className="flex items-center justify-between border-t border-border px-4.5 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-2">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          <b className="font-semibold text-charcoal">{travelerCount}</b>&nbsp;travelers aboard
        </span>
        {confirmingLeave ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-muted">Leave this sailing?</span>
            <button
              type="button"
              onClick={() => removeSailing(sailing.id)}
              className="font-semibold text-coral"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmingLeave(false)}
              className="font-semibold text-muted-2"
            >
              No
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="font-semibold text-teal hover:text-teal-dark"
            >
              ✏️ Edit profile
            </button>
            <button
              type="button"
              onClick={() => setConfirmingLeave(true)}
              className="text-muted-2 hover:text-coral"
            >
              Leave sailing
            </button>
          </span>
        )}
      </div>

      <EditSailingProfileModal
        sailing={sailing}
        open={editingProfile}
        onClose={() => setEditingProfile(false)}
      />
    </div>
  );
}

function parseInlineStyle(style: string): Record<string, string> {
  return Object.fromEntries(
    style.split(";").filter(Boolean).map((rule) => {
      const [key, value] = rule.split(":").map((s) => s.trim());
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return [camelKey, value];
    })
  );
}
