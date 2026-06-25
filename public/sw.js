const SIGNAL_CACHE = "stellarswipe-signals-v1";
const SIGNAL_API_PATTERN = /\/api\/signals/;

// ── Fetch: network-first for signal API ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (SIGNAL_API_PATTERN.test(request.url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SIGNAL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ??
              new Response(
                JSON.stringify({
                  offline: true,
                  items: [],
                  page: 1,
                  pageSize: 0,
                  nextPage: null,
                  hasMore: false,
                }),
                {
                  status: 200,
                  headers: {
                    "Content-Type": "application/json",
                    "X-Offline-Cache": "true",
                  },
                }
              )
          )
        )
    );
  }
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "StellarSwipe Alert";
  const options = {
    body: data.body ?? "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url ?? "/" },
    tag: data.tag ?? "stellarswipe",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return clients.openWindow(target);
      })
  );
});
