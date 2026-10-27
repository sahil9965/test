// Inject a short "Supplies" block of Amazon Associates links into the pages of the money tools listed in tools/affiliate.json,
// between <!--AFFILIATE:START--> and <!--AFFILIATE:END-->, just before the "Related free tools" block (or the FAQ, or </article>).
// - Links go to Amazon search results with the store's tag; pages with lang="en-IN" use the India store, others the US store.
// - Every block carries Amazon's required disclosure. Links are rel="sponsored nofollow noopener" and open in a new tab.
// - Sites not in affiliate.json, about/privacy pages and pages in a site's "skip" list get the block removed.
// Usage: node tools/affiliate.mjs   (finalize.mjs runs it after toollinks.mjs)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(root, "tools/affiliate.json"), "utf8"));
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8")).filter(s => s.live !== false);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function link(store, query) {
  const s = cfg.stores[store];
  if (!s) throw new Error(`affiliate: unknown store ${store}`);
  return `${s.base}?k=${encodeURIComponent(query).replace(/%20/g, "+")}&tag=${encodeURIComponent(s.tag)}`;
}

export function block(site, store, indent = "      ") {
  const items = site[store];
  if (!items || !items.length) return "";
  return `<!--AFFILIATE:START-->\n${indent}<h2 id="supplies">Supplies for printing</h2>\n${indent}<p>${esc(site.intro)}</p>\n${indent}<ul>\n` +
    items.map(([text, q]) => `${indent}  <li><a href="${esc(link(store, q))}" rel="sponsored nofollow noopener" target="_blank">${esc(text)}</a> on Amazon</li>`).join("\n") +
    `\n${indent}</ul>\n${indent}<p><small>${esc(cfg.disclosure)}</small></p>\n${indent}<!--AFFILIATE:END-->`;
}

const RE = /\n?[ \t]*<!--AFFILIATE:START-->[\s\S]*?<!--AFFILIATE:END-->/;
let n = 0, skipped = [];
for (const s of sites) {
  const dir = join(root, "sites", s.slug);
  if (!existsSync(dir)) continue;
  const site = cfg.sites[s.slug];
  for (const f of readdirSync(dir).filter(f => f.endsWith(".html"))) {
    const path = f === "index.html" ? "/" : "/" + f.slice(0, -5);
    const file = join(dir, f);
    const html = readFileSync(file, "utf8");
    let next = html.replace(RE, "");
    const lang = (html.match(/<html[^>]*\blang="([^"]+)"/) || [])[1] || "en";
    const store = lang === "en-IN" ? "in" : "us";
    const want = site && path !== "/about" && path !== "/privacy" && !(site.skip || []).includes(path) ? block(site, store) : "";
    if (want) {
      const at = next.match(/\n([ \t]*)<!--TOOLLINKS:START-->/) || next.match(/\n([ \t]*)<h2 id="faq"/);
      if (at) next = next.replace(at[0], `\n${at[1]}${block(site, store, at[1])}${at[0]}`);
      else if (next.lastIndexOf("</article>") > 0) {
        const i = next.lastIndexOf("</article>");
        next = next.slice(0, i) + want + "\n    " + next.slice(i);
      } else { skipped.push(`${s.slug}${path}`); continue; }
    }
    if (next !== html) { writeFileSync(file, next); n++; }
  }
}
console.log(`affiliate blocks updated in ${n} pages${skipped.length ? `; no place for the block in: ${skipped.join(", ")}` : ""}`);
