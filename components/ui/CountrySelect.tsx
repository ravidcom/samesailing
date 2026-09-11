"use client";

import { useState } from "react";
import { COUNTRIES, COUNTRY_OTHER } from "@/lib/countries";
import { textInput, selectInput } from "@/lib/formStyles";

// Pinned to the top of the unfiltered list - the biggest English-speaking
// cruise-departure markets, so most travelers see their own country without
// having to search or scroll the full alphabetical list.
const POPULAR_COUNTRIES = ["United States", "United Kingdom", "Canada"];

const ALL_COUNTRIES = [...COUNTRIES, COUNTRY_OTHER];

/** Shared by onboarding and My profile so a country picked in either place
 * always matches the same canonical spelling flagUrl() looks up by.
 *
 * A single native <select>, closed by default like any other dropdown in
 * the app - it used to swap in a permanently-expanded, multi-row listbox
 * (the `size` attribute) with a separate "picked" state on top, which
 * looked stuck open before a choice and had no way back in afterward
 * short of clearing the value first. The search box above still narrows
 * which options the (still perfectly normal, closed) select shows once
 * opened. */
export default function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : null;

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
        aria-label="Country"
        className={selectInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Select your country
        </option>
        {filtered ? (
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
