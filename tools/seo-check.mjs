// SEO / launch-readiness linter for one site.  Usage: node tools/seo-check.mjs sites/<slug>
// Exits 1 on any error. Warnings are advisory.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const dir = process.argv[2];
const errors = [], warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`), warn = (f, m) => warns.push(`${f}: ${m}`);
const cfg = existsSync(join(dir, "config.js")) ? readFileSync(join(dir, "config.js"), "utf8") : "";
const siteUrl = (cfg.match(/url:\s*["']([^"']+)["']/) || [])[1];
if (!siteUrl) err("config.js", "missing url");

const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if (f === "node_modules" || f === "api" || f.startsWith(".")) return [];
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});
const pathFor = rel => "/" + rel.replace(/\\/g, "/").replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "");
const exists = href => {
  const p = href.split(/[?#]/)[0].replace(/\/$/, "");
  if (p === "" ) return existsSync(join(dir, "index.html"));
  const base = join(dir, p);
  return existsSync(base + ".html") || existsSync(join(base, "index.html")) || (existsSync(base) && statSync(base).isFile());
};
const text = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

const titles = new Map(), descs = new Map(), canon = [];
for (const file of walk(dir)) {
  const rel = relative(dir, file);
  const html = readFileSync(file, "utf8");
  const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
  if (/__[A-Z0-9_]+__/.test(html)) err(rel, `unreplaced placeholder ${html.match(/__[A-Z0-9_]+__/)[0]}`);
  if (/lorem ipsum|TODO|FIXME/i.test(text(html))) err(rel, "placeholder text (lorem/TODO) in visible content");
  if (!/<html[^>]+lang=/i.test(html)) err(rel, "missing <html lang>");
  if (!/name=["']viewport["']/i.test(html)) err(rel, "missing viewport");
  if (!/\/_vercel\/insights\/script\.js/.test(html)) err(rel, "missing Vercel Analytics script");
  // Internal links
  for (const [, href] of html.matchAll(/href=["'](\/[^"'#?]*)[^"']*["']/g)) {
    if (href.startsWith("/api") || href.startsWith("/_vercel") || href.startsWith("//")) continue;
    if (!exists(href)) err(rel, `broken internal link ${href}`);
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) if (!/\balt=/.test(tag)) err(rel, `img without alt: ${tag.slice(0, 60)}`);
  for (const [, block] of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(block);
      const s = JSON.stringify(j);
      if (/"FAQPage"/.test(s)) { const n = (s.match(/"Question"/g) || []).length; if (n < 3) warn(rel, `FAQPage has only ${n} questions`); }
    } catch (e) { err(rel, `invalid JSON-LD: ${e.message}`); }
  }
  if (noindex) continue;
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim();
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=(["'])(.*?)\1/i) || [])[2]?.trim();
  const can = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1];
  if (!title) err(rel, "missing <title>"); else {
    if (title.length < 30 || title.length > 65) warn(rel, `title length ${title.length} (aim 30-65): ${title}`);
    if (titles.has(title)) err(rel, `duplicate title with ${titles.get(title)}`); titles.set(title, rel);
  }
  if (!desc) err(rel, "missing meta description"); else {
    if (desc.length < 70 || desc.length > 165) warn(rel, `description length ${desc.length} (aim 110-160)`);
    if (descs.has(desc)) err(rel, `duplicate description with ${descs.get(desc)}`); descs.set(desc, rel);
  }
  if (!can) err(rel, "missing canonical"); else {
    const want = siteUrl + (pathFor(rel) === "/" ? "/" : pathFor(rel));
    if (can !== want) err(rel, `canonical ${can} should be ${want}`);
    canon.push(can);
  }
  for (const p of ["og:title", "og:description", "og:image", "og:url"]) if (!new RegExp(`property=["']${p}["']`).test(html)) err(rel, `missing ${p}`);
  const h1 = (html.match(/<h1\b/gi) || []).length;
  if (h1 !== 1) err(rel, `expected exactly one <h1>, found ${h1}`);
  if (!/application\/ld\+json/.test(html) && !/privacy|about|pricing/.test(rel)) warn(rel, "no structured data");
  const words = text((html.match(/<main[\s\S]*<\/main>/i) || [html])[0]).split(" ").length;
  const min = rel === "index.html" ? 700 : /privacy|about|pricing/.test(rel) ? 120 : 450;
  if (words < min) warn(rel, `thin content: ${words} words (aim ${min}+)`);
}
for (const f of ["robots.txt", "sitemap.xml", "llms.txt", "indexnow-key.txt", "og.png", "favicon.svg", "config.js", "pro.js", "base.css", "vercel.json", "api/verify.js", "api/indexnow.js"])
  if (!existsSync(join(dir, f))) err(f, "missing");
if (existsSync(join(dir, "sitemap.xml"))) {
  const sm = readFileSync(join(dir, "sitemap.xml"), "utf8");
  for (const c of canon) if (!sm.includes(`<loc>${c}</loc>`)) err("sitemap.xml", `missing ${c}`);
}
if (existsSync(join(dir, "robots.txt")) && !readFileSync(join(dir, "robots.txt"), "utf8").includes(`${siteUrl}/sitemap.xml`)) err("robots.txt", "Sitemap line must point at site URL");

console.log(`SEO check ${dir}: ${canon.length} indexable pages, ${errors.length} errors, ${warns.length} warnings`);
errors.forEach(e => console.log("  ERROR " + e));
warns.forEach(w => console.log("  warn  " + w));
process.exitCode = errors.length ? 1 : 0;
