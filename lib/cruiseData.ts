import { unstable_cache } from "next/cache";
import fallbackRaw from "./data/royal-caribbean-sailings.json";

/**
 * Server-only module: sailing data (~3,400 records) is fetched from a public
 * Google Sheet (CSV export) so edits there show up on the site without a
 * deploy. Nothing in this file should be imported directly by a "use client"
 * component — use lib/cruiseLineNames.ts for the line list, and
 * lib/cruiseActions.ts (Server Actions) for anything else the client needs.
 */

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1tVy1lrkilQ8YJLnYEmywrdrJyIeXYhUI4TtsqnKFi3A/export?format=csv&gid=0";

export type SailingDate = {
  id: string;
  label: string;
  itinerary: string;
  port: string;
  isoDate: string;
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
    const ship = r[iShip]?.trim();
    const shipCode = r[iShipCode]?.trim();
    const departDate = r[iDepart]?.trim();
    const nights = Number(r[iNights]);
    const itinerary = r[iItinerary]?.trim();
    const region = r[iRegion]?.trim();
    const embarkPort = r[iPort]?.trim();
    const priceRaw = r[iPrice]?.trim();
    if (!id || !ship || !shipCode || !departDate || !itinerary || !region || !embarkPort) continue;
    if (!Number.isFinite(nights)) continue;
    out.push({
      id,
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

async function fetchSheetSailings(): Promise<RawSailing[]> {
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sheet fetch failed with status ${res.status}`);
  const parsed = rowsToRawSailings(parseCsv(await res.text()));
  if (parsed.length === 0) throw new Error("Sheet parsed to zero valid rows");
  return parsed;
}

/**
 * Cached for 5 minutes via Next's persistent data cache (survives across
 * serverless invocations and deploys). Falls back to the bundled snapshot —
 * captured when the dataset was first wired in — if the Sheet is unreachable
 * or gets unshared, so a Sheet outage degrades gracefully instead of taking
 * search down.
 */
const getRawSailings = unstable_cache(
  async (): Promise<RawSailing[]> => {
    try {
      return await fetchSheetSailings();
    } catch (err) {
      console.error("Falling back to bundled sailing data — Sheet fetch failed:", err);
      return fallbackRaw as RawSailing[];
    }
  },
  ["royal-caribbean-sailings"],
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

async function buildRoyalCaribbeanShips(): Promise<Ship[]> {
  const raw = await getRawSailings();
  const byShipCode = new Map<string, { name: string; dates: SailingDate[] }>();

  for (const r of raw) {
    let entry = byShipCode.get(r.shipCode);
    if (!entry) {
      entry = { name: r.ship, dates: [] };
      byShipCode.set(r.shipCode, entry);
    }
    entry.dates.push({
      id: r.id,
      label: formatDateLabel(r.departDate),
      itinerary: `${r.itinerary} · ${r.nights} night${r.nights === 1 ? "" : "s"}`,
      port: r.embarkPort,
      isoDate: r.departDate,
      region: r.region,
      priceFromUsd: r.priceFromUsd,
    });
  }

  const ships: Ship[] = [...byShipCode.entries()].map(([id, { name, dates }]) => ({
    id,
    name,
    dates: dates.sort((a, b) => a.isoDate.localeCompare(b.isoDate)),
  }));

  ships.sort((a, b) => a.name.localeCompare(b.name));
  return ships;
}

export async function getCruiseLines(): Promise<CruiseLines> {
  return {
    "Royal Caribbean": await buildRoyalCaribbeanShips(),
    "MSC Cruises": [
      {
        id: "MSC_SEASCAPE",
        name: "MSC Seascape",
        dates: [
          {
            id: "MSC_SEA_20260808",
            label: "August 8, 2026",
            itinerary: "Caribbean & Bahamas · 7 nights",
            port: "Miami, FL",
            isoDate: "2026-08-08",
          },
          {
            id: "MSC_SEA_20260822",
            label: "August 22, 2026",
            itinerary: "Caribbean & Bahamas · 7 nights",
            port: "Miami, FL",
            isoDate: "2026-08-22",
          },
        ],
      },
    ],
    Carnival: [
      { id: "CARN_CELEB", name: "Carnival Celebration", dates: [] },
      { id: "CARN_MARDI", name: "Mardi Gras", dates: [] },
    ],
    Norwegian: [{ id: "NCL_ENCORE", name: "Norwegian Encore", dates: [] }],
  };
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
  region?: string;
};

export async function getSailingById(id: string): Promise<SailingInfo | null> {
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
          region: d.region,
        };
      }
    }
  }
  return null;
}

/** Sailings below this many joined travelers show a "founding member" pitch instead of a browse-first one. */
export const MIN_BROWSE_THRESHOLD = 10;

/** Hand-picked demo counts for a few sailings; anything else falls back to a stable hash-based count below. */
const SAILING_MEMBERS: Record<string, number> = {
  MSC_SEA_20260808: 2,
};

/** Cheap, stable string hash so the same sailing always gets the same synthetic member count. */
function hashCount(id: string, max: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % (max + 1);
}

export function memberCount(sailingId: string): number {
  if (sailingId in SAILING_MEMBERS) return SAILING_MEMBERS[sailingId];
  return hashCount(sailingId, 18);
}

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
      return ["Barcelona", "Rome", "Santorini"];
    case "Alaska":
      return ["Juneau", "Skagway", "Ketchikan"];
    case "Asia":
      return ["Singapore", "Penang", "Phuket"];
    case "Pacific":
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
    default:
      return ["Nassau", "Cozumel"];
  }
}

export function portsFor(sailing: SailingInfo): string[] {
  const home = sailing.port.split(",")[0];
  const stops = stopsForRegion(sailing.region, sailing.itinerary);
  return [home, ...stops, home];
}
