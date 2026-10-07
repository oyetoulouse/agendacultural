/* Oye Toulouse — service worker
   Siempre pide la versión más nueva a la red (sin caché del navegador).
   La caché solo se usa si no hay conexión. */
const CACHE = "oye-v3";
const CORE = ["./", "index.html", "styles.css", "app.js", "config.js", "i18n.js", "story.js", "manifest.json",
  "img/logo.png", "img/logo-completo.png", "img/icon-192.png", "img/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Google Sheets, YouTube y fuentes van directo
  e.respondWith(
    fetch(e.request, { cache: "no-store" }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
