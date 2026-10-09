// Scaffold a new site from kit/.  Usage: node tools/new-site.mjs <slug> <siteUrl> "<Name>" <accentHex>
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [slug, url, name, accent = "#2f5bea"] = process.argv.slice(2);
if (!slug || !url || !name) { console.error("usage: new-site <slug> <url> <name> [accent]"); process.exit(1); }
const site = join(root, "sites", slug);
const kit = join(root, "kit");
mkdirSync(join(site, "api"), { recursive: true });

for (const f of ["pro.js", "base.css", "vercel.json", "api/verify.js", "api/indexnow.js"]) copyFileSync(join(kit, f), join(site, f));
writeFileSync(join(site, "robots.txt"), readFileSync(join(kit, "robots.txt"), "utf8").replaceAll("__SITE_URL__", url));
if (!existsSync(join(site, "indexnow-key.txt"))) writeFileSync(join(site, "indexnow-key.txt"), randomBytes(16).toString("hex") + "\n");
writeFileSync(join(site, "site.webmanifest"), JSON.stringify({ name, short_name: name, start_url: "/", display: "standalone", background_color: "#fbfaf7", theme_color: accent, icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }] }, null, 2) + "\n");
if (!existsSync(join(site, "config.js"))) writeFileSync(join(site, "config.js"), `// allFree: true keeps every feature free with no upgrade UI. To sell Pro later, set it to
// false and fill in the Gumroad checkout links (one network-wide Pro pass works on every site).
window.SITE = {
  name: ${JSON.stringify(name)},
  url: ${JSON.stringify(url)},
  allFree: true,
  monthlyUrl: "https://gumroad.com/",
  lifetimeUrl: "https://gumroad.com/",
  monthlyPrice: "",
  lifetimePrice: "",
  proFeatures: [],
};
`);
console.log(`scaffolded sites/${slug}`);
