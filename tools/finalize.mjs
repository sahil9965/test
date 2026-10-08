// Pre-deploy finalisation for every site in sites.json:
//  1. vercel.json: 308-redirect any non-canonical host (auto-assigned aliases, team aliases,
//     deployment URLs) to the canonical host so search engines see one URL per page.
//  2. Inject the cross-site "More free tools" footer links (tools/network.mjs).
//  3. Run the SEO linter on every site and exit non-zero if any site has errors.
// Usage: node tools/finalize.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8"));
let failed = 0;
for (const s of sites) {
  const dir = join(root, "sites", s.slug);
  if (!existsSync(join(dir, "index.html"))) { console.log(`skip ${s.slug}: not built`); continue; }
  const vj = join(dir, "vercel.json");
  const cfg = JSON.parse(readFileSync(vj, "utf8"));
  const host = new URL(s.url).host;
  const rule = { source: "/:path*", missing: [{ type: "host", value: host }], destination: `https://${host}/:path*`, permanent: true };
  cfg.redirects = [rule, ...(cfg.redirects || []).filter(r => !(r.missing && r.missing.some(m => m.type === "host")))];
  writeFileSync(vj, JSON.stringify(cfg, null, 2) + "\n");
}
execFileSync("node", [join(root, "tools/network.mjs")], { stdio: "inherit" });
for (const s of sites) {
  const dir = join(root, "sites", s.slug);
  if (!existsSync(join(dir, "index.html"))) continue;
  try { execFileSync("node", [join(root, "tools/seo-check.mjs"), dir], { stdio: ["ignore", "pipe", "inherit"] }).toString().split("\n").slice(0, 1).forEach(l => console.log(l)); }
  catch (e) { failed++; console.log(e.stdout.toString()); }
}
process.exitCode = failed ? 1 : 0;
