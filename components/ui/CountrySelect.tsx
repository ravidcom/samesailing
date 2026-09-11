"use client";

import { COUNTRIES, COUNTRY_OTHER } from "@/lib/countries";
import { selectInput } from "@/lib/formStyles";

// Pinned to the top of the list - the biggest English-speaking
// cruise-departure markets, so most travelers see their own country without
// scrolling the full alphabetical list.
const POPULAR_COUNTRIES = ["United States", "United Kingdom", "Canada"];

/** Shared by onboarding and My profile so a country picked in either place
 * always matches the same canonical spelling flagUrl() looks up by.
 *
 * A single native <select> - one row, closed by default like any other
 * dropdown in the app. A separate search box used to sit above it (to
 * narrow a `size`-expanded listbox that showed matches inline), but that
 * left two rows on screen even after a country was already picked, one of
 * them a stray leftover of whatever was last typed into the search box.
 * A native select's own type-to-jump (focus it, start typing) covers the
 * same need in the one row. */
export default function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      aria-label="Country"
      className={selectInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Select your country
      </option>
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
    </select>
  );
}
