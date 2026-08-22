export type ChatMessage = {
  id: string;
  mine: boolean;
  sender: string;
  body: string;
  ts: string;
  day?: string;
  deleted?: boolean;
  /** Epoch ms, used for unread comparisons. Absent on seed/demo messages. */
  atMs?: number;
  /** The sender's account id, so the sender line can look up their Pioneer badge. Absent on seed/demo messages. */
  userId?: string;
};

export const GROUP_SEED_MESSAGES: ChatMessage[] = [
  {
    id: "g1",
    mine: false,
    sender: "Family · ages 38–48",
    day: "Yesterday",
    body: "Hey everyone! First time on this ship. Any tips for embarkation day? We have two kids (8 and 12) and want to make the most of day one 👏",
    ts: "2:14 PM",
  },
  {
    id: "g2",
    mine: false,
    sender: "Couple · ages 50–60",
    body: "Get there early! Rooms aren't ready until 1pm but the pool deck opens right away. Grab a poolside spot - it's the least crowded it'll ever be 😄",
    ts: "2:31 PM",
  },
  {
    id: "g3",
    mine: true,
    sender: "You",
    body: "+1 to the pool deck tip. Also - Windjammer opens for lunch right away. Don't miss the sailaway party at 4pm!",
    ts: "3:02 PM",
  },
  {
    id: "g4",
    mine: false,
    sender: "Friends group · ages 25–35",
    day: "Today",
    body: "Anyone doing Cozumel independently? We're thinking of renting a golf cart and exploring on our own",
    ts: "9:48 AM",
  },
  {
    id: "g5",
    mine: false,
    sender: "Solo · ages 40–50",
    body: "Yes! I did that last year - highly recommend Mr. Sanchos beach club. Very affordable 🏖",
    ts: "10:05 AM",
  },
  {
    id: "g6",
    mine: false,
    sender: "Family · ages 35–45",
    body: "",
    ts: "10:22 AM",
    deleted: true,
  },
];

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
