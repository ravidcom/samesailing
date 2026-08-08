import royalCaribbeanRaw from "./data/royal-caribbean-sailings.json";
import { daysUntilDate, countdownLabelForDays } from "./dateMath";

/**
 * Server-only module: `royalCaribbeanRaw` is ~3,400 records (~700KB). Nothing
 * in this file should be imported directly by a "use client" component —
 * use lib/cruiseLineNames.ts for the line list, and lib/cruiseActions.ts
 * (Server Actions) for anything else the client needs to query.
 */

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

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildRoyalCaribbeanShips(): Ship[] {
  const byShipCode = new Map<string, { name: string; dates: SailingDate[] }>();

  for (const raw of royalCaribbeanRaw as RawSailing[]) {
    let entry = byShipCode.get(raw.shipCode);
    if (!entry) {
      entry = { name: raw.ship, dates: [] };
      byShipCode.set(raw.shipCode, entry);
    }
    entry.dates.push({
      id: raw.id,
      label: formatDateLabel(raw.departDate),
      itinerary: `${raw.itinerary} · ${raw.nights} night${raw.nights === 1 ? "" : "s"}`,
      port: raw.embarkPort,
      isoDate: raw.departDate,
      region: raw.region,
      priceFromUsd: raw.priceFromUsd,
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

export const CRUISE_LINES: CruiseLines = {
  "Royal Caribbean": buildRoyalCaribbeanShips(),
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

/** Flat id -> sailing index, built once at module load for O(1) lookups across ~3,400+ records. */
const SAILING_INDEX = new Map<string, SailingInfo>();
for (const [line, ships] of Object.entries(CRUISE_LINES)) {
  for (const ship of ships) {
    for (const d of ship.dates) {
      SAILING_INDEX.set(d.id, {
        id: d.id,
        line,
        shipId: ship.id,
        shipName: ship.name,
        date: d.label,
        itinerary: d.itinerary,
        port: d.port,
        isoDate: d.isoDate,
        region: d.region,
      });
    }
  }
}

export function getSailingById(id: string): SailingInfo | null {
  return SAILING_INDEX.get(id) ?? null;
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

export function getIsoDate(sailingId: string): string | null {
  return SAILING_INDEX.get(sailingId)?.isoDate ?? null;
}

export function daysUntilSailing(sailingId: string): number | null {
  const iso = getIsoDate(sailingId);
  return iso ? daysUntilDate(iso) : null;
}

export function countdownLabel(sailingId: string): string {
  return countdownLabelForDays(daysUntilSailing(sailingId));
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
