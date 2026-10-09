// GoalTally offline support. Pages and scripts: network first, cached copy when offline.
// The pinned PDF library in /vendor/ is cache first. Student data never passes through here:
// it lives in this browser's local storage and is never sent anywhere.
const CACHE = "goaltally-22068f944f";
const SHELL = ["/","/iep-data-sheet-generator","/trial-by-trial-data-sheet","/prompt-level-data-sheet","/cold-probe-data-sheet","/task-analysis-data-sheet","/frequency-data-sheet","/duration-recording-data-sheet","/partial-interval-recording-data-sheet","/whole-interval-recording-data-sheet","/momentary-time-sampling-data-sheet","/abc-data-sheet","/iep-progress-monitoring-graph","/phase-change-line-graph","/aba-graph-template-excel","/base.css","/style.css","/config.js","/pro.js","/core.js","/sheets.js","/render.js","/app.js","/sheet-ui.js","/favicon.svg","/site.webmanifest","/vendor/jspdf-4.2.1.umd.min.js"];
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
  if (url.pathname.startsWith("/vendor/")) { e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => put(req, res)))); return; }
  e.respondWith(fetch(req).then(res => put(req, res)).catch(() =>
    caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("/") : Response.error()))));
});
