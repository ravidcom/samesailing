import { cache } from "react";
import { unstable_cache } from "next/cache";
import fallbackRaw from "./data/all-sailings-fallback.json";
import { isSailingSearchable } from "./dateMath";

/**
 * Server-only module: sailing data (~3,400+ records, multiple cruise lines)
 * is fetched from a public Google Sheet (CSV export) so edits there —
 * including adding a whole new line — show up on the site without a code
 * change or deploy. Nothing in this file should be imported directly by a
 * "use client" component — use lib/cruiseActions.ts (Server Actions) for
 * anything the client needs.
 */

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1tVy1lrkilQ8YJLnYEmywrdrJyIeXYhUI4TtsqnKFi3A/export?format=csv&gid=0";

export type SailingDate = {
  id: string;
  label: string;
  itinerary: string;
  port: string;
  isoDate: string;
  nights: number;
  region?: string;
  priceFromUsd?: number | null;
};

export type Ship = {
  id: string;
  name: string;
  dates: SailingDate[];
};

export type CruiseLines = Record<string, Ship[]>;

type RawSailing = {
  id: string;
  line: string;
  ship: string;
  shipCode: string;
  departDate: string;
  nights: number;
  itinerary: string;
  region: string;
  embarkPort: string;
  priceFromUsd: number | null;
};

/** Minimal RFC4180 parser: handles quoted fields with embedded commas/quotes/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function rowsToRawSailings(rows: string[][]): RawSailing[] {
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iId = col("sailing id");
  const iLine = col("line");
  const iShip = col("ship");
  const iShipCode = col("ship code");
  const iDepart = col("depart date");
  const iNights = col("nights");
  const iItinerary = col("itinerary");
  const iRegion = col("region");
  const iPort = col("embark port");
  const iPrice = col("price from (usd)");

  const out: RawSailing[] = [];
  for (const r of rows.slice(1)) {
    const id = r[iId]?.trim();
    const line = r[iLine]?.trim();
    const ship = r[iShip]?.trim();
    const shipCode = r[iShipCode]?.trim();
    const departDate = r[iDepart]?.trim();
    const nights = Number(r[iNights]);
    const itinerary = r[iItinerary]?.trim();
    const region = r[iRegion]?.trim();
    const embarkPort = r[iPort]?.trim();
    const priceRaw = r[iPrice]?.trim();
    if (!id || !line || !ship || !shipCode || !departDate || !itinerary || !region || !embarkPort) continue;
    if (!Number.isFinite(nights)) continue;
    out.push({
      id,
      line,
      ship,
      shipCode,
      departDate,
      nights,
      itinerary,
      region,
      embarkPort,
      priceFromUsd: priceRaw ? Number(priceRaw) || null : null,
    });
  }
  return out;
}

async function fetchSheetSailingsOnce(): Promise<RawSailing[]> {
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Sheet fetch failed with status ${res.status}`);
  const parsed = rowsToRawSailings(parseCsv(await res.text()));
  if (parsed.length === 0) throw new Error("Sheet parsed to zero valid rows");
  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A single transient blip (a slow response, one bad status code) used to
// fall straight through to the Royal-Caribbean-only fallback below for a
// full 5-minute cache window - retrying first means only a genuinely
// sustained outage (not a one-off hiccup) ever reaches that fallback path
// at all.
const RETRY_DELAYS_MS = [500, 1500];
async function fetchSheetSailings(): Promise<RawSailing[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);
    try {
      return await fetchSheetSailingsOnce();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// Best-effort, in-memory copy of the last successful Sheet fetch on this
// warm server instance, preferred over the (older, static) bundled snapshot
// below on a transient failure - this is what's actually live a moment ago,
// not a fixed point-in-time capture.
let lastGoodRawSailings: RawSailing[] | null = null;

/**
 * Cached for 5 minutes via Next's persistent data cache (survives across
 * serverless invocations and deploys). Falls back to the last successful
 * fetch on this instance, or - failing that - the bundled snapshot (a full
 * capture of every line in the Sheet, not just Royal Caribbean - an
 * earlier version of this fallback only had Royal Caribbean's ships, which
 * made every Celebrity/other-line sailing 404 during a Sheet outage as if
 * it didn't exist, even a real, already-joined one), if the Sheet is
 * unreachable or gets unshared, so an outage degrades gracefully instead
 * of taking the whole site down.
 */
const getRawSailings = unstable_cache(
  async (): Promise<RawSailing[]> => {
    try {
      const fresh = await fetchSheetSailings();
      lastGoodRawSailings = fresh;
      return fresh;
    } catch (err) {
      console.error("Sheet fetch failed, falling back:", err);
      if (lastGoodRawSailings) return lastGoodRawSailings;
      return fallbackRaw as RawSailing[];
    }
  },
  ["all-sailings"],
  { revalidate: 300 }
);

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Groups raw sailings by line, then by ship — both derived from the data, not hardcoded. */
async function buildCruiseLines(): Promise<CruiseLines> {
  const raw = await getRawSailings();
  const byLine = new Map<string, Map<string, { name: string; dates: SailingDate[] }>>();

  for (const r of raw) {
    let ships = byLine.get(r.line);
    if (!ships) {
      ships = new Map();
      byLine.set(r.line, ships);
    }
    let entry = ships.get(r.shipCode);
    if (!entry) {
      entry = { name: r.ship, dates: [] };
      ships.set(r.shipCode, entry);
    }
    entry.dates.push({
      id: r.id,
      label: formatDateLabel(r.departDate),
      itinerary: `${r.itinerary} · ${r.nights} night${r.nights === 1 ? "" : "s"}`,
      port: r.embarkPort,
      isoDate: r.departDate,
      nights: r.nights,
      region: r.region,
      priceFromUsd: r.priceFromUsd,
    });
  }

  const cruiseLines: CruiseLines = {};
  for (const [line, ships] of byLine) {
    const shipList: Ship[] = [...ships.entries()].map(([id, { name, dates }]) => ({
      id,
      name,
      dates: dates.sort((a, b) => a.isoDate.localeCompare(b.isoDate)),
    }));
    shipList.sort((a, b) => a.name.localeCompare(b.name));
    cruiseLines[line] = shipList;
  }
  return cruiseLines;
}

export async function getCruiseLines(): Promise<CruiseLines> {
  return buildCruiseLines();
}

export async function getCruiseLineNames(): Promise<string[]> {
  const cruiseLines = await getCruiseLines();
  return Object.keys(cruiseLines).sort((a, b) => a.localeCompare(b));
}

/** Every still-searchable sailing id across every line/ship, flattened - for
 * the sitemap. Excludes sailings that have already departed (past their
 * isSailingSearchable() cutoff) - the same filter already applied to the
 * homepage's search dropdown (getShipsForLine/getDatesForShip), so a sailing
 * disappears from both places at once instead of lingering, indexed, in
 * search results after it's no longer discoverable on the site itself. */
export async function getAllSailingIds(): Promise<string[]> {
  const cruiseLines = await getCruiseLines();
  return Object.values(cruiseLines).flatMap((ships) =>
    ships.flatMap((ship) =>
      ship.dates.filter((date) => isSailingSearchable(date.isoDate, date.nights)).map((date) => date.id)
    )
  );
}

export type SailingInfo = {
  id: string;
  line: string;
  shipId: string;
  shipName: string;
  date: string;
  itinerary: string;
  port: string;
  isoDate: string;
  nights: number;
  region?: string;
};

// Wrapped in React's cache() so a page's generateMetadata() and its own
// component body - both calling this for the same id in one request, e.g.
// app/sailing/[id]/page.tsx - share one lookup instead of two.
export const getSailingById = cache(async function getSailingById(id: string): Promise<SailingInfo | null> {
  const cruiseLines = await getCruiseLines();
  for (const [line, ships] of Object.entries(cruiseLines)) {
    for (const ship of ships) {
      const d = ship.dates.find((date) => date.id === id);
      if (d) {
        return {
          id: d.id,
          line,
          shipId: ship.id,
          shipName: ship.name,
          date: d.label,
          itinerary: d.itinerary,
          port: d.port,
          isoDate: d.isoDate,
          nights: d.nights,
          region: d.region,
        };
      }
    }
  }
  return null;
});

/** Sailings below this many joined travelers show a "founding member" pitch instead of a browse-first one. */
export const MIN_BROWSE_THRESHOLD = 10;

/**
 * Demo/illustrative stops only — not the sailing's real itinerary — used to
 * fill out the "Your route" strip on the board page. Picked per region so
 * cruises outside the Caribbean don't show Caribbean ports.
 */
function stopsForRegion(region: string | undefined, itinerary: string): string[] {
  switch (region) {
    case "Caribbean & Bahamas":
      if (itinerary.startsWith("Eastern")) return ["Nassau", "St. Thomas", "St. Maarten"];
      if (itinerary.startsWith("Western")) return ["Cozumel", "Roatán", "Costa Maya"];
      if (itinerary.startsWith("Southern")) return ["Aruba", "Curaçao", "Barbados"];
      return ["Nassau", "Perfect Day at CocoCay"];
    case "Mexico & California":
      return ["Cabo San Lucas", "Mazatlán", "Puerto Vallarta"];
    case "Europe":
    case "Mediterranean":
      return ["Barcelona", "Rome", "Santorini"];
    case "Northern Europe":
      return ["Bergen", "Copenhagen", "Amsterdam"];
    case "Alaska":
      return ["Juneau", "Skagway", "Ketchikan"];
    case "Asia":
      return ["Singapore", "Penang", "Phuket"];
    case "Pacific":
    case "Transpacific":
      return ["Honolulu", "Sydney"];
    case "Bermuda":
      return ["King's Wharf"];
    case "Canada & New England":
      return ["Halifax", "Bar Harbor", "Saint John"];
    case "Transatlantic":
      return ["Crossing the Atlantic"];
    case "Australia & NZ":
      return ["Sydney", "Auckland", "Brisbane"];
    case "Panama Canal":
      return ["Cartagena", "Panama Canal"];
    case "South America & Antarctica":
      return ["Buenos Aires", "Ushuaia"];
    default:
      // Unrecognized/ambiguous region (e.g. "Other") — no fabricated stops
      // rather than guessing wrong. portsFor() degrades to just the home
      // port with 0 "ports of call" shown, which is honest either way.
      return [];
  }
}

export function portsFor(sailing: SailingInfo): string[] {
  const home = sailing.port.split(",")[0];
  const stops = stopsForRegion(sailing.region, sailing.itinerary);
  // One-way/repositioning itineraries ("Transatlantic Barcelona to Fort
  // Lauderdale", "Alaska one-way Seward to Vancouver") end at a different
  // port than they start — the destination is embedded in the itinerary
  // text itself, so pull it out instead of always looping back to home.
  const oneWayMatch = sailing.itinerary.match(/ to ([^·]+)/i);
  const endPort = oneWayMatch ? oneWayMatch[1].trim() : home;
  return [home, ...stops, endPort];
}
