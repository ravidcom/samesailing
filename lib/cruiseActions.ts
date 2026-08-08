"use server";

import {
  getCruiseLines,
  getSailingById,
  type SailingDate,
  type SailingInfo,
} from "./cruiseData";

/**
 * Server Actions — the only way client components should reach the ~3,400-record
 * Royal Caribbean dataset. Next.js compiles these into small RPC stubs on the
 * client; the actual data and lookup logic never enter the client bundle.
 */

export async function getSailingByIdAction(id: string): Promise<SailingInfo | null> {
  return getSailingById(id);
}

export type ShipOption = { id: string; name: string; hasSailings: boolean };

export async function getShipsForLine(line: string): Promise<ShipOption[]> {
  const cruiseLines = await getCruiseLines();
  return (cruiseLines[line] ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    hasSailings: s.dates.length > 0,
  }));
}

export async function getDatesForShip(line: string, shipId: string): Promise<SailingDate[]> {
  const cruiseLines = await getCruiseLines();
  const ship = (cruiseLines[line] ?? []).find((s) => s.id === shipId);
  return ship?.dates ?? [];
}
