// Generates every GoalTally page (home, landing pages, about, privacy) plus sw.js from one layout.
// Usage: node src/goaltally/pages.mjs   (writes into sites/goaltally/)
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { PAGES } from "./content.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../sites/goaltally");
const URL = "https://abagraph.roohsites.com";
const NAME = "GoalTally";
const ACCENT = "#0369a1";
const DATE = "2026-10-08", DATE_H = "8 October 2026";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

const SHEETS = [
  ["/trial-by-trial-data-sheet", "Trial-by-trial"], ["/prompt-level-data-sheet", "Prompt level"], ["/cold-probe-data-sheet", "Cold probe"],
  ["/task-analysis-data-sheet", "Task analysis"], ["/frequency-data-sheet", "Frequency"], ["/duration-recording-data-sheet", "Duration & latency"],
  ["/partial-interval-recording-data-sheet", "Partial interval"], ["/whole-interval-recording-data-sheet", "Whole interval"],
  ["/momentary-time-sampling-data-sheet", "Momentary time sampling"], ["/abc-data-sheet", "ABC"],
];
const GRAPHS = [["/", "ABA graph maker"], ["/iep-progress-monitoring-graph", "IEP progress monitoring graph"], ["/phase-change-line-graph", "Phase change line graph"], ["/aba-graph-template-excel", "ABA graph template (Excel)"]];

function page(p) {
  const path = p.slug === "" ? "/" : "/" + p.slug;
  const url = p.slug === "" ? `${URL}/` : `${URL}/${p.slug}`;
  const isHome = p.slug === "";
  const graph = [];
  const app = { "@type": "WebApplication", name: isHome ? NAME : `${p.h1} (${NAME})`, url, description: p.desc, applicationCategory: "EducationalApplication", operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@type": "Organization", name: "Rooh Sites", url: "https://roohsites.com/" } };
  if (isHome) app.featureList = ["Phase-change lines that break the data path", "Condition labels", "Aim line", "Least-squares or split-middle trend lines", "Mastery criterion check", "Up to 3 data series", "Paste from Excel or Google Sheets", "PNG and PDF export", "Printable data sheets for 11 measurement types", "Works offline", "No signup; data stays in the browser"];
  if (p.tool) graph.push(app);
  if (!isHome) graph.push({ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: NAME, item: `${URL}/` }, { "@type": "ListItem", position: 2, name: p.crumb || p.h1, item: url }] });
  if (p.howto) graph.push({ "@type": "HowTo", name: p.howto.name, totalTime: p.howto.time || "PT3M", step: p.howto.steps.map(([n, t]) => ({ "@type": "HowToStep", name: n, text: strip(t) })) });
  if (p.faq && p.faq.length) graph.push({ "@type": "FAQPage", mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })) });
  const toolHTML = !p.tool ? "" : p.tool.kind === "graph"
    ? `    <section class="tool card" aria-label="ABA graph maker"><div id="gt-graph" data-preset="${p.tool.preset || "ab"}"></div><noscript><p>The graph maker needs JavaScript. Everything runs in your browser; nothing is uploaded.</p></noscript></section>\n`
    : `    <section class="tool card" aria-label="Data sheet generator"><div id="gt-sheet" data-preset="${p.tool.preset}"></div><noscript><p>The data sheet generator needs JavaScript. Everything runs in your browser; nothing is uploaded.</p></noscript></section>\n`;
  const related = p.related || [...GRAPHS, ["/iep-data-sheet-generator", "All data sheets"], ...SHEETS].filter(([h]) => h !== path).slice(0, 12);
  const scripts = !p.tool ? "" : `<script src="/core.js" defer></script>
<script src="/sheets.js" defer></script>
<script src="/render.js" defer></script>
<script src="/app.js" defer></script>
${p.tool.kind === "sheet" ? `<script src="/sheet-ui.js" defer></script>\n` : ""}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="${ACCENT}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(p.ogTitle || p.title.replace(/ \| GoalTally$/, ""))}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/base.css">
<link rel="stylesheet" href="/style.css">
<script src="/config.js"></script>
<script defer src="/pro.js"></script>
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="top">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="28" height="28">${NAME}</a>
    <nav aria-label="Main"><a href="/">Graph maker</a><a href="/iep-data-sheet-generator">Data sheets</a><a href="/iep-progress-monitoring-graph">Progress graph</a>${p.faq && p.faq.length ? `<a href="#faq">FAQ</a>` : `<a href="/about">About</a>`}</nav>
  </header>
  <main id="main">
${isHome ? "" : `    <p class="crumbs"><a href="/">${NAME}</a> › ${esc(p.crumb || p.h1)}</p>\n`}    <section class="hero">
      <h1>${esc(p.h1)}</h1>
      <p class="lead">${p.lead}</p>
${p.tool ? `      <ul class="badges"><li>Free</li><li>No signup</li><li>Nothing uploaded</li><li>Works offline</li></ul>
      <p class="privacy-note">Runs entirely in your browser. Use student initials, not names.</p>
` : ""}    </section>
${toolHTML}    <article class="content narrow">
${p.body}
${p.faq && p.faq.length ? `      <h2 id="faq">Frequently asked questions</h2>\n${p.faq.map(([q, a]) => `      <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n")}\n` : ""}${p.noRelated ? "" : `      <h2>${p.relatedTitle || "More free graphs and data sheets"}</h2>
      <ul class="related">
${related.map(([h, t]) => `        <li><a href="${h}">${esc(t)}</a></li>`).join("\n")}
      </ul>
`}      <p class="small muted">Last updated <time datetime="${DATE}">${DATE_H}</time> · Written by the Rooh Sites team.${p.footnote ? " " + p.footnote : ""}</p>
    </article>
  </main>
  <footer class="site">
    <div class="cols">
      <div><h4>${NAME}</h4><ul><li><a href="/">ABA graph maker</a></li><li><a href="/iep-data-sheet-generator">IEP data sheet generator</a></li><li><a href="/iep-progress-monitoring-graph">IEP progress monitoring graph</a></li><li><a href="/phase-change-line-graph">Phase change line graph</a></li><li><a href="/aba-graph-template-excel">ABA graph template (Excel)</a></li><li><a href="/about">About</a></li><li><a href="/privacy">Privacy &amp; Terms</a></li></ul></div>
      <div><h4>Data sheets</h4><ul>${SHEETS.map(([h, t]) => `<li><a href="${h}">${esc(t)}</a></li>`).join("")}</ul></div>
      <div><h4>More free tools</h4><!--NETWORK:START--><!--NETWORK:END--></div>
    </div>
    <p>© 2026 ${NAME} · Free tools that respect your privacy. Not affiliated with any school district, clinic, certification board or software vendor.</p>
  </footer>
</div>
${scripts}</body>
</html>
`;
}

const report = [];
for (const p of PAGES) {
  let html = page(p);
  // Keep the network links that tools/network.mjs filled in, so regenerating never wipes them.
  const NET = /<!--NETWORK:START-->[\s\S]*?<!--NETWORK:END-->/;
  const file = join(OUT, (p.slug || "index") + ".html");
  const prev = existsSync(file) ? (readFileSync(file, "utf8").match(NET) || [])[0] : null;
  if (prev) html = html.replace(NET, () => prev);
  writeFileSync(file, html);
  const words = strip((html.match(/<main[\s\S]*<\/main>/) || [""])[0]).split(" ").length;
  report.push(`${(p.slug || "/").padEnd(40)} title ${String(p.title.length).padStart(2)}  desc ${String(p.desc.length).padStart(3)}  words ${words}`);
  if (p.title.length < 45 && !/about|privacy/.test(p.slug)) report.push("   ! title short");
  if (p.title.length > 62) report.push("   ! title long");
  if (p.desc.length < 120 || p.desc.length > 158) report.push("   ! desc length");
}
console.log(report.join("\n"));

// Service worker: network-first for pages and scripts, cache-first for the pinned PDF library.
const shell = ["/", ...PAGES.filter(p => p.tool && p.slug).map(p => "/" + p.slug), "/base.css", "/style.css", "/config.js", "/pro.js", "/core.js", "/sheets.js", "/render.js", "/app.js", "/sheet-ui.js", "/favicon.svg", "/site.webmanifest", "/vendor/jspdf-4.2.1.umd.min.js"];
const ver = createHash("sha1").update(shell.join() + ["core.js", "sheets.js", "render.js", "app.js", "sheet-ui.js", "style.css"].map(f => readFileSync(join(OUT, f), "utf8")).join("")).digest("hex").slice(0, 10);
writeFileSync(join(OUT, "sw.js"), `// GoalTally offline support. Pages and scripts: network first, cached copy when offline.
// The pinned PDF library in /vendor/ is cache first. Student data never passes through here:
// it lives in this browser's local storage and is never sent anywhere.
const CACHE = "goaltally-${ver}";
const SHELL = ${JSON.stringify(shell)};
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
`);
console.log(`wrote ${PAGES.length} pages + sw.js (${ver})`);
