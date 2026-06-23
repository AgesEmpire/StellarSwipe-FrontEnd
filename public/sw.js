// Offline support for the signal feed: cache the most recent successful
// /api/signals response (network-first) and serve it when the network is down.
const SIGNAL_CACHE = "stellarswipe-signals-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SIGNAL_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/api/signals")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(SIGNAL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(SIGNAL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response(JSON.stringify([]), {
          status: 503,
          headers: { "Content-Type": "application/json", "X-Offline-Fallback": "true" },
        });
      })
  );
});
