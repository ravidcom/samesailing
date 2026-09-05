"use client";

import { useEffect, useRef, useState } from "react";
import type { JoinedSailing } from "@/lib/auth-context";

/** The sailing picker, shared verbatim by the Chat sidebar and the
 * Passengers screen so the two never drift into two different pickers.
 * Renders nothing if `activeId` isn't in `sailings` at all (e.g. Passengers
 * viewing a sailing the visitor hasn't joined), and falls back to plain
 * static text - no caret, not focusable, no menu - when there's only one
 * sailing to show. */
export default function SailingSwitcher({
  sailings,
  activeId,
  unreadBySailing,
  onSelect,
}: {
  sailings: JoinedSailing[];
  activeId: string;
  unreadBySailing?: Record<string, number> | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const active = sailings.find((s) => s.id === activeId);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  if (!active) return null;

  if (sailings.length <= 1) {
    return (
      <div className="shrink-0 border-b border-border bg-[#f3fbfb] px-3.5 py-2.5">
        <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#d8ebec] bg-white px-3 py-2 font-sans text-[13px] font-bold text-charcoal">
          <span className="truncate">
            {active.shipName} · {active.date}
          </span>
        </div>
      </div>
    );
  }

  function openMenu() {
    setHighlightIndex(Math.max(0, sailings.findIndex((s) => s.id === activeId)));
    setOpen(true);
  }

  function closeMenu(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openMenu();
    }
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % sailings.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + sailings.length) % sailings.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const s = sailings[highlightIndex];
      if (s) {
        onSelect(s.id);
        closeMenu(true);
      }
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0 border-b border-border bg-[#f3fbfb] px-3.5 py-2.5">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 font-sans text-[13px] font-bold transition-colors ${
          open ? "border-teal bg-teal-tint text-[#0a6e79]" : "border-[#d8ebec] bg-white text-charcoal"
        }`}
      >
        <span className="truncate">
          {active.shipName} · {active.date}
        </span>
        <span className="shrink-0 text-xs">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Your sailings"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute inset-x-3.5 top-full z-30 mt-1.5 max-h-[60vh] overflow-y-auto rounded-2xl border border-[#d8ebec] bg-white py-1.5 shadow-[0_20px_40px_-18px_rgba(14,80,88,.5)] outline-none"
        >
          <div className="px-3.5 pt-1 pb-1.5 text-[10.5px] font-bold tracking-[.08em] text-[#8aa6aa] uppercase">
            Your sailings
          </div>
          {sailings.map((s, i) => {
            const isActive = s.id === activeId;
            const count = unreadBySailing?.[s.id] ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={isActive}
                tabIndex={-1}
                onMouseEnter={() => setHighlightIndex(i)}
                onClick={() => {
                  onSelect(s.id);
                  closeMenu(true);
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.25 text-left transition-colors hover:bg-input ${
                  isActive ? "bg-teal-tint" : ""
                } ${highlightIndex === i ? "bg-input" : ""}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#e6f5f7] text-[15px]">
                  ⚓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-charcoal">{s.shipName}</span>
                  <span className="block text-[11.5px] text-muted-2">{s.date}</span>
                </span>
                {count > 0 ? (
                  <span className="shrink-0 rounded-full bg-coral px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
                {isActive ? <span className="shrink-0 text-sm font-bold text-teal">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
