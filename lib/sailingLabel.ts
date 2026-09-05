/**
 * The app-wide sailing-naming rule: a sailing is a ship *and* a departure
 * date, since a user can be on two sailings of the same ship (two separate
 * passenger lists, two separate group chats). The ship name alone is
 * ambiguous between those two; the itinerary alone is long and not unique
 * either, so it's never used as the label.
 */

/** The distinctive part of a ship name for a chip/tab label - "Anthem of
 * the Seas" -> "Anthem". Ships whose name leads with their own line
 * ("Celebrity Solstice", "Carnival Celebration") would otherwise show just
 * the line ("Celebrity") with no way to tell which ship - if `line` is
 * given and the name starts with it, that prefix is stripped first so the
 * first word taken is the actually-distinguishing one ("Solstice"). */
export function shortShipName(shipName: string, line?: string): string {
  const rest =
    line && shipName.toLowerCase().startsWith(`${line.toLowerCase()} `) ? shipName.slice(line.length + 1) : shipName;
  return rest.split(" ")[0];
}

/** Sort key: the YYYY-MM-DD suffix every sailing id ends with (e.g.
 * "AP-2026-08-15" -> "2026-08-15"), which sorts correctly as a plain
 * string and avoids depending on the display date string's format. */
export function sailingDateKey(sailingId: string): string {
  return sailingId.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? sailingId;
}

function parseDate(dateLabel: string): { month: string; day: string; year: string } | null {
  const m = dateLabel.match(/^(\w+) (\d+), (\d+)$/);
  if (!m) return null;
  return { month: m[1].slice(0, 3), day: m[2], year: m[3] };
}

/** "October 25, 2026" -> "Oct 25, 2026" - abbreviated month, year kept, for
 * compact spots (card meta lines, hero eyebrow rows) that have no other
 * date context to fall back on. */
export function shortDateWithYear(dateLabel: string): string {
  const d = parseDate(dateLabel);
  return d ? `${d.month} ${d.day}, ${d.year}` : dateLabel;
}

/**
 * Short-form labels ("Anthem · Aug 31") for chips/tabs/tags. The year is
 * only added when two of the given sailings share a calendar month across
 * different years - otherwise month + day alone is enough to tell them
 * apart, and the label shouldn't grow for no reason.
 */
export function shortSailingLabels<T extends { id: string; shipName: string; date: string; line?: string }>(
  sailings: T[]
): Map<string, string> {
  const parsed = sailings.map((s) => ({ s, d: parseDate(s.date) }));
  const yearsByMonth = new Map<string, Set<string>>();
  for (const { d } of parsed) {
    if (!d) continue;
    const years = yearsByMonth.get(d.month) ?? new Set<string>();
    years.add(d.year);
    yearsByMonth.set(d.month, years);
  }

  const labels = new Map<string, string>();
  for (const { s, d } of parsed) {
    if (!d) {
      labels.set(s.id, `${shortShipName(s.shipName, s.line)} · ${s.date}`);
      continue;
    }
    const needsYear = (yearsByMonth.get(d.month)?.size ?? 0) > 1;
    labels.set(s.id, `${shortShipName(s.shipName, s.line)} · ${d.month} ${d.day}${needsYear ? `, ${d.year}` : ""}`);
  }
  return labels;
}
