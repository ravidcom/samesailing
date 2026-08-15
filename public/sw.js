// SameSailing.com service worker.
//
// Registered only to satisfy installability heuristics (Chrome's "Add to
// Home Screen" / install prompt generally expects a registered service
// worker). It intentionally does no caching — every request just falls
// through to the network — so it can never leave anyone stuck on a stale
// deploy. If offline support is ever added, that caching logic goes here.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No respondWith() — requests pass straight through to the network.
});
