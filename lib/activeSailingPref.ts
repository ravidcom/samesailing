/** Which sailing's chat/passengers view the user was last looking at -
 * persisted per user (not reset each visit) and shared between the Chat
 * sidebar and the Passengers screen's sailing switchers, so picking a
 * sailing in one place is reflected in the other. */
function activeSailingPrefKey(userId: string) {
  return `samesailing:activeChatSailing:${userId}`;
}

export function loadActiveSailingPref(userId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(activeSailingPrefKey(userId));
}

export function saveActiveSailingPref(userId: string, sailingId: string) {
  localStorage.setItem(activeSailingPrefKey(userId), sailingId);
}
