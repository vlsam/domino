// Service worker. Verze se bere z version.js (jediný zdroj).
importScripts("version.js");

const CACHE = "robosoutez-" + APP_VERSION;
const PRECACHE = ["./", "index.html", "install.js", "version.js", "manifest.webmanifest", "app.js", "app.css",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "img/hriste.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Ze sítě, při výpadku z cache.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("/version.js") && url.search) return; // kontrola verze: jen ze sítě, bez cache
  event.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) return res;
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});
