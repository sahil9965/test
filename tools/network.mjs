// Inject the cross-site "More free tools" list into every page of every site, between
// <!--NETWORK:START--> and <!--NETWORK:END-->, using sites.json. Usage: node tools/network.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8"));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if (f === "node_modules" || f === "api") return [];
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});
let n = 0;
for (const s of sites) {
  const others = sites.filter(o => o.slug !== s.slug);
  const block = `<!--NETWORK:START--><ul>${others.map(o => `<li><a href="${esc(o.url)}/" title="${esc(o.tagline)}">${esc(o.label)}</a></li>`).join("")}</ul><!--NETWORK:END-->`;
  const dir = join(root, "sites", s.slug);
  if (!existsSync(dir)) continue;
  for (const f of walk(dir)) {
    const html = readFileSync(f, "utf8");
    const next = html.replace(/<!--NETWORK:START-->[\s\S]*?<!--NETWORK:END-->/, block);
    if (next !== html) { writeFileSync(f, next); n++; }
  }
}
console.log(`network links updated in ${n} pages`);
