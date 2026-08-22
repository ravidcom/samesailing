/**
 * Pure date-math helpers with zero dependency on cruiseData.ts, safe to
 * import from client components (e.g. SailingCard) without pulling in the
 * ~3,400-record dataset.
 */

export function daysUntilDate(isoOrLabel: string): number | null {
  const parsed = new Date(isoOrLabel);
  if (isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parsed.getTime() - today.getTime()) / 86400000);
}

/** `nights` bounds "Currently sailing" to the cruise's actual date range
 * (departure through departure+nights) - past that, the cruise has
 * returned and there's nothing left to count down, so no label at all
 * rather than claiming it's still underway indefinitely. */
export function countdownLabelForDays(days: number | null, nights: number): string {
  if (days === null) return "";
  if (days > 1) return `${days} days to go`;
  if (days === 1) return "Tomorrow!";
  if (days === 0) return "Setting sail today!";
  if (days >= -nights) return "Currently sailing";
  return "";
}

/**
 * A sailing stays searchable through 7 days after it returns (departure +
 * nights), then drops out of search. This only gates discovery — direct
 * links (join/board/chat) for a sailing someone already joined keep working
 * regardless of age, since getSailingById() doesn't use this filter.
 */
export function isSailingSearchable(isoDate: string, nights: number): boolean {
  const depart = new Date(isoDate);
  if (isNaN(depart.getTime())) return true;
  const cutoff = new Date(depart);
  cutoff.setDate(cutoff.getDate() + nights + 7);
  cutoff.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today <= cutoff;
}
