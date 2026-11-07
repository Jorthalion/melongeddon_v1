/*
 * Offline support for the installable web app.
 * On install it caches every file of the build (listed in precache.json, written by the
 * vite.config.ts plugin), so the game runs with no connection after the first visit.
 * Pages are network-first (you get updates when online); everything else is cache-first.
 * BUILD_ID is replaced at build time, so each new build installs a fresh cache.
 */
const CACHE = "melongeddon-__BUILD_ID__";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const list = await fetch("./precache.json", { cache: "no-store" }).then((r) => r.json());
      await cache.addAll(list.files.map((f) => `./${f}`));
      await cache.add("./");
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE && key.startsWith("melongeddon-")) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put("./", fresh.clone());
          return fresh;
        } catch {
          return (await caches.match(req)) ?? (await caches.match("./")) ?? (await caches.match("./index.html")) ?? Response.error();
        }
      })(),
    );
    return;
  }
  event.respondWith(
    (async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const fresh = await fetch(req);
      if (fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
      return fresh;
    })(),
  );
});
