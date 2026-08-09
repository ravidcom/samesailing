"use server";

import {
  getCruiseLineNames,
  getCruiseLines,
  getSailingById,
  type SailingDate,
  type SailingInfo,
} from "./cruiseData";
import { isSailingSearchable } from "./dateMath";

/**
 * Server Actions — the only way client components should reach the
 * multi-thousand-record cruise dataset. Next.js compiles these into small
 * RPC stubs on the client; the actual data and lookup logic never enter the
 * client bundle.
 */

export async function getSailingByIdAction(id: string): Promise<SailingInfo | null> {
  return getSailingById(id);
}

export async function getCruiseLineNamesAction(): Promise<string[]> {
  return getCruiseLineNames();
}

export type ShipOption = { id: string; name: string; hasSailings: boolean };

export async function getShipsForLine(line: string): Promise<ShipOption[]> {
  const cruiseLines = await getCruiseLines();
  return (cruiseLines[line] ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    hasSailings: s.dates.some((d) => isSailingSearchable(d.isoDate, d.nights)),
  }));
}

export async function getDatesForShip(line: string, shipId: string): Promise<SailingDate[]> {
  const cruiseLines = await getCruiseLines();
  const ship = (cruiseLines[line] ?? []).find((s) => s.id === shipId);
  return (ship?.dates ?? []).filter((d) => isSailingSearchable(d.isoDate, d.nights));
}
