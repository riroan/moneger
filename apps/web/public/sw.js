// Minimal service worker — required for PWA installability on Chrome/Android.
// Intentionally does not intercept fetches to avoid stale data on a finance app.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: let the network handle it.
});
