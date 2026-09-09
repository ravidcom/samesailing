"use server";

import { getCachedSailingPassengers } from "./sailingPassengers";

/** The only bit of the passenger list a client component (the onboarding
 * wizard's success step) actually needs - not the rows themselves. */
export async function getSailingPassengerCountAction(sailingId: string): Promise<number> {
  const rows = await getCachedSailingPassengers(sailingId);
  return rows.length;
}
