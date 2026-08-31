/**
 * Lets the globally-rendered MobileTabBar close the open chat thread when
 * the user re-taps the already-lit Chat tab, without ChatApp and
 * MobileTabBar needing a shared parent/context - ChatApp registers a
 * closer while its thread view is mounted, MobileTabBar calls it.
 */
let closer: (() => boolean) | null = null;

export function registerChatThreadCloser(fn: (() => boolean) | null) {
  closer = fn;
}

/** Returns true if a thread was open and got closed (caller should treat the tap as handled). */
export function tryCloseChatThread(): boolean {
  return closer ? closer() : false;
}
