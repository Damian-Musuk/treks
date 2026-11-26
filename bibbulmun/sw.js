// Offline cache for the Bibbulmun app. Bump VERSION whenever any file changes.
const VERSION = "v1.1.0";
const CACHE = "bibbulmun-" + VERSION;
const FILES = [
  "./",
  "index.html",
  "css/app.css",
  "js/app.js",
  "js/content.js",
  "js/progress.js",
  "data/progress.json",
  "post/",
  "post/post.js",
  "data/stops.json",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bibbulmun-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Live data (progress and photos): network first, fall back to the saved copy.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res.ok) cache.put(req.url.split("?")[0], res.clone());
    return res;
  } catch {
    const hit = await cache.match(req.url.split("?")[0]);
    if (!hit) throw new Error("offline and not cached");
    const h = new Headers(hit.headers); h.set("x-from-cache", "1");
    return new Response(hit.body, { status: hit.status, headers: h });
  }
}

// Everything else: cache first, then refresh in the background so the next open has new files.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("/data/progress.json") || url.pathname.includes("/data/photos/")) {
    return e.respondWith(networkFirst(req));
  }
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true }) ||
        (req.mode === "navigate" ? await cache.match("index.html") : undefined);
      const fresh = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "version") e.source.postMessage({ type: "version", version: VERSION });
});
