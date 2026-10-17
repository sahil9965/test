// Inject contextual "Related free tools" links to sister tools into each page's body, just before the FAQ
// (or before </article> when a page has no FAQ), between <!--TOOLLINKS:START--> and <!--TOOLLINKS:END-->.
// Links come from tools/toollinks.json; every target must exist as a built page or the script fails.
// Usage: node tools/toollinks.mjs   (finalize.mjs runs it after network.mjs)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8")).filter(s => s.live !== false);
const map = JSON.parse(readFileSync(join(root, "tools/toollinks.json"), "utf8"));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const bySite = Object.fromEntries(sites.map(s => [new URL(s.url).host, s.slug]));

// Fail loudly on a link to a page that doesn't exist.
const targetFile = url => {
  const u = new URL(url), slug = bySite[u.host];
  if (!slug) return null;
  return join(root, "sites", slug, u.pathname === "/" ? "index.html" : u.pathname.slice(1) + ".html");
};
for (const [slug, pages] of Object.entries(map)) {
  if (slug.startsWith("_")) continue;
  for (const links of Object.values(pages)) for (const [url] of links) {
    const f = targetFile(url);
    if (!f || !existsSync(f)) throw new Error(`toollinks: ${slug} links to missing page ${url}`);
    if (bySite[new URL(url).host] === slug) throw new Error(`toollinks: ${slug} links to itself (${url})`);
  }
}

const RE = /\n?[ \t]*<!--TOOLLINKS:START-->[\s\S]*?<!--TOOLLINKS:END-->/;
let n = 0, skipped = [];
for (const s of sites) {
  const pages = map[s.slug];
  const dir = join(root, "sites", s.slug);
  if (!pages || !existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter(f => f.endsWith(".html"))) {
    const path = f === "index.html" ? "/" : "/" + f.slice(0, -5);
    if (path === "/about" || path === "/privacy") continue;
    const links = pages[path] ?? pages["*"] ?? [];
    const file = join(dir, f);
    const html = readFileSync(file, "utf8");
    let next = html.replace(RE, "");
    if (links.length) {
      const block = `<!--TOOLLINKS:START-->\n      <h2>Related free tools</h2>\n      <ul>\n` +
        links.map(([url, text, note]) => `        <li><a href="${esc(url)}">${esc(text)}</a>: ${esc(note)}.</li>`).join("\n") +
        `\n      </ul>\n      <!--TOOLLINKS:END-->`;
      const faq = next.match(/\n([ \t]*)<h2 id="faq"/);
      if (faq) next = next.replace(faq[0], `\n${faq[1]}${block}\n${faq[1]}<h2 id="faq"`);
      else if (next.lastIndexOf("</article>") > 0) {
        const i = next.lastIndexOf("</article>");
        next = next.slice(0, i) + block + "\n    " + next.slice(i);
      } else { skipped.push(`${s.slug}${path}`); continue; }
    }
    if (next !== html) { writeFileSync(file, next); n++; }
  }
}
console.log(`tool links updated in ${n} pages${skipped.length ? `; no FAQ or article in: ${skipped.join(", ")}` : ""}`);
