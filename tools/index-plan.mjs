// Applies tools/index-plan.json (the Search Console clean-up of 12 Nov 2026):
//  - every page of a "hidden" tool gets <meta name="robots" content="noindex,follow">,
//  - pages listed under "noindex_pages" get the same,
//  - every other page keeps (or gets back) index,follow,
// then rebuilds each site's sitemap.xml (tools/sitemap.mjs skips noindex pages). The cross-site footer links come
// from the same file ("related") via tools/network.mjs. Idempotent; to undo, empty a list and run it again.
// Usage: node tools/index-plan.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const plan = JSON.parse(readFileSync(join(root, "tools", "index-plan.json"), "utf8"));
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8")).filter(s => s.live !== false);
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if (f === "node_modules" || f === "api" || f.startsWith(".")) return [];
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});
const ROBOTS = /<meta[^>]+name=["']robots["'][^>]*>/i;
const INDEX = '<meta name="robots" content="index,follow,max-image-preview:large">';
const NOINDEX = '<meta name="robots" content="noindex,follow">';
let changed = 0, hiddenPages = 0, listed = 0;
for (const s of sites) {
  const dir = join(root, "sites", s.slug);
  if (!existsSync(join(dir, "index.html"))) continue;
  const hidden = plan.hidden.includes(s.slug);
  const pages = new Set(plan.noindex_pages[s.slug] || []);
  let touched = false;
  for (const f of walk(dir)) {
    const rel = relative(dir, f);
    if (rel === "404.html") continue;
    const html = readFileSync(f, "utf8");
    if (!ROBOTS.test(html)) continue;
    const want = hidden || pages.has(rel) ? NOINDEX : INDEX;
    if (want === NOINDEX) hidden ? hiddenPages++ : listed++;
    const next = html.replace(ROBOTS, want);
    if (next !== html) { writeFileSync(f, next); changed++; touched = true; }
  }
  for (const p of pages) if (!existsSync(join(dir, p))) { console.error(`index-plan: ${s.slug}/${p} not found`); process.exitCode = 1; }
  if (touched) execFileSync("node", [join(root, "tools", "sitemap.mjs"), dir], { stdio: "inherit" });
}
console.log(`index-plan: ${hiddenPages} pages of ${plan.hidden.length} hidden tools and ${listed} listed pages are noindex; ${changed} files changed`);
