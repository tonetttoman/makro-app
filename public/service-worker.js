const BASE_PATH = "/makro-app/";
const CACHE_NAME = "etrend-pwa-v1.2.1";
const STATIC_ASSETS = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "manifest.webmanifest",
  BASE_PATH + "pwa-192.png",
  BASE_PATH + "pwa-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const sameOrigin = new URL(event.request.url).origin === self.location.origin;
          if (sameOrigin && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(BASE_PATH).then((fallback) => fallback || caches.match(BASE_PATH + "index.html")));
    })
  );
});
