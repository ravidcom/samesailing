"use client";

import { useState } from "react";
import { COUNTRIES, COUNTRY_OTHER } from "@/lib/countries";
import { textInput } from "@/lib/formStyles";

// Pinned to the top of the unfiltered list - the biggest English-speaking
// cruise-departure markets, so most travelers see their own country without
// having to search or scroll the full alphabetical list.
const POPULAR_COUNTRIES = ["United States", "United Kingdom", "Canada"];

const ALL_COUNTRIES = [...COUNTRIES, COUNTRY_OTHER];

/** Shared by onboarding and My profile so a country picked in either place
 * always matches the same canonical spelling flagUrl() looks up by. */
export default function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()));
  const listSize = search ? Math.min(Math.max(filtered.length, 2), 6) : 5;

  if (value) {
    return (
      <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-[#dff1f2] px-3 py-2 text-sm font-semibold text-teal">
        <span>✓ {value}</span>
        <button
          type="button"
          onClick={() => onChange("")}
          className="ml-auto bg-none text-base text-muted-2 hover:text-muted"
          aria-label="Clear country"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        className={textInput + " mb-1.5"}
        placeholder="🌍 Search country..."
        aria-label="Search country"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        size={listSize}
        aria-label="Country"
        className="w-full cursor-pointer rounded-[11px] border-[1.5px] border-border bg-input p-1.5 font-sans text-base sm:text-sm text-charcoal"
        onChange={(e) => onChange(e.target.value)}
        value=""
      >
        <option value="" disabled hidden />
        {search ? (
          filtered.map((c) => (
            <option key={c} value={c}>
              {c === COUNTRY_OTHER ? "🌍 Other / Not listed" : c}
            </option>
          ))
        ) : (
          <>
            <optgroup label="Popular">
              {POPULAR_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
            <optgroup label="All countries">
              {COUNTRIES.filter((c) => !POPULAR_COUNTRIES.includes(c)).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={COUNTRY_OTHER}>🌍 Other / Not listed</option>
            </optgroup>
          </>
        )}
      </select>
    </>
  );
}
