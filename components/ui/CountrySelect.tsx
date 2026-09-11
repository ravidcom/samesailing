"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, COUNTRY_OTHER } from "@/lib/countries";
import { textInput, selectInput } from "@/lib/formStyles";

// Pinned to the top of the unfiltered list - the biggest English-speaking
// cruise-departure markets, so most travelers see their own country without
// having to search or scroll the full alphabetical list.
const POPULAR_COUNTRIES = ["United States", "United Kingdom", "Canada"];

const ALL_COUNTRIES = [...COUNTRIES, COUNTRY_OTHER];

function label(c: string) {
  return c === COUNTRY_OTHER ? "🌍 Other / Not listed" : c;
}

/** Shared by onboarding and My profile so a country picked in either place
 * always matches the same canonical spelling flagUrl() looks up by.
 *
 * Custom-built rather than a native <select> - a real device testing this
 * as an installed PWA couldn't get the OS picker to open at all (a known
 * class of bug with native form controls inside some Android WebView/PWA
 * contexts). Rendering the list ourselves, the same way SailingSwitcher
 * does for the sailing picker, sidesteps relying on the platform's picker
 * working correctly at all - one row closed, a normal dropdown panel
 * (with its own search box, so that doesn't cost a second permanent row)
 * open. */
export default function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = search
    ? ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : null;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function openMenu() {
    setSearch("");
    setOpen(true);
  }

  function pick(c: string) {
    onChange(c);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={selectInput + " flex items-center justify-between text-left"}
      >
        <span className={value ? "" : "text-muted-2"}>{value || "Select your country"}</span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Country"
          className="absolute inset-x-0 top-full z-[160] mt-1.5 overflow-hidden rounded-[11px] border-[1.5px] border-border bg-white shadow-[0_20px_40px_-18px_rgba(14,80,88,.5)]"
        >
          <input
            ref={searchRef}
            className={textInput + " rounded-none border-x-0 border-t-0"}
            placeholder="🌍 Search country..."
            aria-label="Search country"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <div className="max-h-[45vh] overflow-y-auto py-1">
            {filtered ? (
              filtered.length > 0 ? (
                filtered.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="option"
                    aria-selected={c === value}
                    onClick={() => pick(c)}
                    className={`block w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-input ${
                      c === value ? "bg-teal-tint font-semibold text-teal" : "text-charcoal"
                    }`}
                  >
                    {label(c)}
                  </button>
                ))
              ) : (
                <div className="px-3.5 py-2 text-sm text-muted-2">No matches</div>
              )
            ) : (
              <>
                <div className="px-3.5 pt-1.5 pb-1 text-[10.5px] font-bold tracking-[.08em] text-muted-2 uppercase">
                  Popular
                </div>
                {POPULAR_COUNTRIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="option"
                    aria-selected={c === value}
                    onClick={() => pick(c)}
                    className={`block w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-input ${
                      c === value ? "bg-teal-tint font-semibold text-teal" : "text-charcoal"
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <div className="px-3.5 pt-2 pb-1 text-[10.5px] font-bold tracking-[.08em] text-muted-2 uppercase">
                  All countries
                </div>
                {ALL_COUNTRIES.filter((c) => !POPULAR_COUNTRIES.includes(c)).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="option"
                    aria-selected={c === value}
                    onClick={() => pick(c)}
                    className={`block w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-input ${
                      c === value ? "bg-teal-tint font-semibold text-teal" : "text-charcoal"
                    }`}
                  >
                    {label(c)}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
