// Roomproof offline support. Pages and app scripts are network-first (fresh when online, cached
// copy when offline). The pinned PDF library in /vendor/ is cache-first. Photos never pass
// through here: they are read and stored by the page itself, on this device.
const CACHE = "roomproof-v1";
const SHELL = ["/", "/base.css", "/style.css", "/config.js", "/pro.js", "/core.js", "/photo.js", "/pdf.js", "/app.js", "/favicon.svg", "/vendor/jspdf-4.2.1.umd.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const put = (req, res) => { if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return res; };
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/_vercel/")) return;
  if (url.pathname.startsWith("/vendor/")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res))));
    return;
  }
  e.respondWith(fetch(req).then(res => put(req, res)).catch(() =>
    caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("/") : Response.error()))));
});
