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

export function countdownLabelForDays(days: number | null): string {
  if (days === null) return "";
  if (days > 1) return `${days} days to go`;
  if (days === 1) return "Tomorrow!";
  if (days === 0) return "Setting sail today!";
  return "Currently sailing";
}
