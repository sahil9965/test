// Build sitemap.xml from every indexable .html page's canonical URL.  Usage: node tools/sitemap.mjs sites/<slug> [YYYY-MM-DD]
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const dir = process.argv[2];
const date = process.argv[3] || new Date().toISOString().slice(0, 10);
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if (f === "node_modules" || f === "api" || f.startsWith(".")) return [];
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});
const entries = [];
for (const file of walk(dir)) {
  const html = readFileSync(file, "utf8");
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) continue;
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (!m) { console.error(`no canonical: ${relative(dir, file)}`); process.exitCode = 1; continue; }
  const loc = m[1];
  const isHome = /^https?:\/\/[^/]+\/?$/.test(loc);
  entries.push({ loc, priority: isHome ? "1.0" : "0.8" });
}
entries.sort((a, b) => b.priority.localeCompare(a.priority) || a.loc.localeCompare(b.loc));
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url><loc>${e.loc}</loc><lastmod>${date}</lastmod><priority>${e.priority}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync(join(dir, "sitemap.xml"), xml);
console.log(`sitemap.xml: ${entries.length} URLs`);
