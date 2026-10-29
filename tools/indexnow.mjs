// Submit each site's sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver, Yep...) from the machine this runs on.
// The Pages Function /api/indexnow does the same from Cloudflare, but on 29 Oct 2026 IndexNow answered 429 to every site
// when called from there, so the workflows run this on the GitHub runner instead. It reads the local files that are deployed
// (sites/<slug>/sitemap.xml and indexnow-key.txt); keyLocation points at the live key file on the site's own host.
// Tries api.indexnow.org first and www.bing.com/indexnow if that refuses. Never fails the job: it prints a warning instead.
// Usage: node tools/indexnow.mjs all | <slug> [slug...]   (hub = tools.roohsites.com)
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const all = JSON.parse(readFileSync(join(root, "sites.json"), "utf8")).filter(s => s.live !== false).map(s => s.slug).concat("hub");
const args = process.argv.slice(2).flatMap(a => a.split(/\s+/)).filter(Boolean);
const slugs = !args.length || args.includes("all") ? all : args;
const ENDPOINTS = ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow"];

const rows = [];
for (const slug of slugs) {
  const dir = join(root, "sites", slug);
  const keyFile = join(dir, "indexnow-key.txt"), mapFile = join(dir, "sitemap.xml");
  if (!existsSync(keyFile) || !existsSync(mapFile)) { rows.push([slug, "-", 0, "no key or sitemap"]); continue; }
  const key = readFileSync(keyFile, "utf8").trim();
  const urls = [...readFileSync(mapFile, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  if (!urls.length) { rows.push([slug, "-", 0, "empty sitemap"]); continue; }
  const { origin, host } = new URL(urls[0]);
  const body = JSON.stringify({ host, key, keyLocation: `${origin}/indexnow-key.txt`, urlList: urls });
  const tries = [];
  for (const ep of ENDPOINTS) {
    let status;
    try {
      const r = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body, signal: AbortSignal.timeout(60000) });
      status = r.status;
    } catch (e) { status = `error: ${e.message}`; }
    tries.push(`${new URL(ep).host} ${status}`);
    if (status === 200 || status === 202) break;
  }
  rows.push([slug, host, urls.length, tries.join(", ")]);
}

const ok = rows.filter(r => / (200|202)$/.test(r[3])).length;
const table = ["| site | host | URLs | IndexNow answer |", "|---|---|---|---|", ...rows.map(r => `| ${r.join(" | ")} |`)].join("\n");
console.log(table);
console.log(`${ok} of ${rows.length} sites accepted (200 = received, 202 = received, key check pending; 429 = too many requests).`);
if (ok < rows.length) console.log(`::warning title=IndexNow::${rows.length - ok} of ${rows.length} sites were not accepted; see the table.`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### IndexNow\n\n${table}\n\n${ok} of ${rows.length} accepted.\n`);
