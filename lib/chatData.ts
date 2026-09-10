export type ChatMessage = {
  id: string;
  mine: boolean;
  sender: string;
  body: string;
  ts: string;
  day?: string;
  deleted?: boolean;
  /** Epoch ms, used for unread comparisons. */
  atMs?: number;
  /** The sender's account id, so the sender line can look up their Pioneer badge. */
  userId?: string;
};

export function formatTimeLabel(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes < 10 ? "0" : ""}${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/** Time column for a chat-list row: a clock time for today, a short weekday
 * for the last week, otherwise a short date - so an old thread's row
 * doesn't claim to have happened "just now" at some HH:MM. */
export function chatListTimeLabel(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatTimeLabel(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);
  if (diffDays >= 0 && diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
