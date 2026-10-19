
const CACHE_NAME = "lesku-cache-v1";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (
          response.ok &&
          new URL(event.request.url).origin === self.location.origin
        ) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, copy)
          );
        }

        return response;
      });
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clients => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      return self.clients.openWindow("./index.html");
    })
  );
});
