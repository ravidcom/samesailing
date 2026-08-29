"use client";

import { useEffect, useRef, useState } from "react";

/** Native share sheet where available, falling back to a small copy
 * link/WhatsApp/email menu - same pattern already used for sharing a
 * sailing's board from its header card. */
export default function ShareInviteButton({
  url,
  title,
  text,
  label,
  className,
  copiedLabel = "Link copied ✓",
}: {
  url: string;
  title: string;
  text: string;
  label: string;
  className: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // user dismissed the native share sheet - nothing to do
      }
      return;
    }
    setMenuOpen((open) => !open);
  }

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setMenuOpen(false);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
  }

  function shareEmail() {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
    setMenuOpen(false);
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button type="button" onClick={handleClick} className={className}>
        {copied ? copiedLabel : label}
      </button>
      {menuOpen ? (
        <div className="absolute top-full left-1/2 z-20 mt-1.5 w-48 -translate-x-1/2 overflow-hidden rounded-[11px] border border-border bg-white py-1.5 text-left shadow-[0_8px_24px_rgba(0,0,0,.12)]">
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
  );
}
