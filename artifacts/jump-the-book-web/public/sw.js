// Jump the Book — minimal service worker.
// Strategy:
//   1. Scene images (App Storage objects) → cache-first, immutable for 30 days.
//      Once a scene image is generated we never want to re-fetch it; this is
//      both a perf win and an offline-read win for previously viewed scenes.
//   2. App shell (HTML / JS / CSS) → network-first with cache fallback so the
//      reader still gets *something* if they're offline mid-flight.
//   3. Everything else (API JSON, third-party) → passthrough.

const SCENE_CACHE = "jtb-scenes-v1";
const SHELL_CACHE = "jtb-shell-v1";
const SCENE_PATH_RE = /\/api\/storage\/objects\/scene-images\//;

self.addEventListener("install", (event) => {
  // Activate immediately so users on the second visit get the SW behavior.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SCENE_CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Same-origin scene image: cache-first.
  if (SCENE_PATH_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SCENE_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            // Clone before caching — the body can only be read once.
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch (err) {
          // Offline fallback: only return an exact (vary-respecting) cache
          // match. We deliberately do NOT use `ignoreVary` here so future
          // changes to auth/Vary headers can never accidentally serve a
          // cached image to the wrong request identity.
          const fallback = await cache.match(req);
          if (fallback) return fallback;
          throw err;
        }
      })(),
    );
    return;
  }

  // Same-origin HTML / static assets: network-first.
  if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch (err) {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          throw err;
        }
      })(),
    );
    return;
  }

  // API JSON / third-party: passthrough (no caching — freshness wins).
});
