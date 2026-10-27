// Adds the day's automatic Pinterest pins to tools/pins-auto.json ("per_day" of them) and draws them with tools/pins.mjs.
// A pin only repeats what its page already says: the page's <h1> (headline), its first intro sentence or the tool's tagline (subline),
// its meta description, and the tool's feature badges (the points in pins-auto.json). No AI and no made-up claims.
// Skipped: about, privacy and 404 pages, noindex pages, and India pages (lang en-IN; Pinterest traffic is mostly US and UK).
// Order: tools take turns (the one whose last pin is longest ago goes first; money tools come round about twice as often), never the
// same tool twice in one day, and a tool's home page before its other pages. When every page has a pin, it makes a second version
// of a page with its <title> as the headline instead; when that is used up too, it adds nothing and says so.
// Usage: node tools/pins-auto.mjs [count] [--dry-run]   (the "pins-daily" workflow runs it every morning)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CFG_FILE = join(ROOT, "tools/pins-auto.json");
const cfg = JSON.parse(readFileSync(CFG_FILE, "utf8"));
const schedule = JSON.parse(readFileSync(join(ROOT, "sites/hub/pins/schedule.json"), "utf8")).posts;
const sites = JSON.parse(readFileSync(join(ROOT, "sites.json"), "utf8")).filter(s => s.live !== false && cfg.sites[s.slug]);
const bySlug = Object.fromEntries(sites.map(s => [s.slug, s]));
const byHost = Object.fromEntries(sites.map(s => [new URL(s.url).host, s.slug]));
const count = Number(process.argv.find(a => /^\d+$/.test(a)) || cfg.per_day || 3);
const dry = process.argv.includes("--dry-run");
const MONEY_BONUS = 9;          // a money tool is due again this many schedule places sooner
const MAX_HEADLINE = 48;        // longer headlines take 3 lines on the image

const unesc = s => String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
  .replace(/&times;/g, "×").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ");
const text = s => unesc(String(s || "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cleanHead = h => h.replace(/\s*\((?:[^)]*\b(?:free|printable|editable)\b[^)]*)\)\s*$/i, "").trim();

// what is already scheduled: page keys (slug + path), how many versions each page has, titles, image names, each tool's last place
const versions = {}, last = {}, titles = new Set(schedule.map(p => p.title)), files = new Set(schedule.map(p => p.image.split("/").pop().replace(/\.png$/, "")));
schedule.forEach((p, i) => {
  const u = new URL(p.link), slug = byHost[u.host];
  if (!slug) return;
  const key = `${slug}${u.pathname}`;
  versions[key] = (versions[key] || 0) + 1;
  last[slug] = i;
});

function readPage(slug, f) {
  const html = readFileSync(join(ROOT, "sites", slug, f), "utf8");
  const lang = (html.match(/<html[^>]*\blang="([^"]+)"/) || [])[1] || "en";
  if (lang === "en-IN" || /<meta name="robots" content="[^"]*noindex/i.test(html)) return null;
  const h1 = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]);
  const title = text((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
  const desc = text((html.match(/<meta name="description" content="([^"]*)"/) || [])[1]);
  const lede = text((html.match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
  if (!h1 || !desc) return null;
  return { path: f === "index.html" ? "/" : "/" + f.slice(0, -5), h1, title, desc, lede };
}

function pages(slug) {
  const dir = join(ROOT, "sites", slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith(".html") && !/^(about|privacy|404)\.html$/.test(f))
    .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)))
    .map(f => readPage(slug, f)).filter(Boolean);
}

// a pin for one page; version 1 uses the <h1>, version 2 the first part of the <title>
function makePin(slug, pg, version) {
  const site = bySlug[slug], c = cfg.sites[slug];
  let headline = version === 1 ? cleanHead(pg.h1) : cleanHead(pg.title.split(/\s+[—–|]\s+|\s+-\s+/)[0]);
  if (headline.length > MAX_HEADLINE && version === 1) headline = cleanHead(pg.title.split(/\s+[—–|]\s+|\s+-\s+/)[0]);
  if (!headline || headline.length > MAX_HEADLINE || titles.has(headline)) return null;
  const first = pg.lede.split(/(?<=[.!?])\s+/)[0].replace(/[.!?]$/, "");
  const sub = version === 1 && first && first.length <= 64 ? first : site.tagline;
  if (!sub || sub === headline) return null;
  let file = slugify(pg.path === "/" ? headline : pg.path.slice(1)) + (version > 1 ? `-v${version}` : "");
  for (let n = 2; files.has(file); n++) file = `${file.replace(/-\d+$/, "")}-${n}`;
  const visual = Object.entries(c.visual_by_path || {}).find(([re]) => new RegExp(re).test(pg.path))?.[1] || c.visual;
  const kw = [...new Set([headline.toLowerCase().replace(/^free /, ""), ...c.keywords.split(/,\s*/)])].slice(0, 5).join(", ");
  return { slug, file, path: pg.path, board: c.board, headline, sub, points: c.points, visual, desc: pg.desc.slice(0, 480), keywords: kw,
    added: new Date().toISOString().slice(0, 10) };
}

// tools in turn order: longest since their last pin first, money tools due sooner
const order = sites.map(s => s.slug).sort((a, b) =>
  ((last[a] ?? -99) - (cfg.money.includes(a) ? MONEY_BONUS : 0)) - ((last[b] ?? -99) - (cfg.money.includes(b) ? MONEY_BONUS : 0)) || a.localeCompare(b));
const lastSlug = schedule.length ? byHost[new URL(schedule[schedule.length - 1].link).host] : null;
const picked = [];
for (const version of [1, 2]) {
  for (const slug of order) {
    if (picked.length >= count) break;
    if (picked.some(p => p.slug === slug) || (picked.length === 0 && slug === lastSlug)) continue;
    for (const pg of pages(slug)) {
      if ((versions[`${slug}${pg.path}`] || 0) !== version - 1) continue;
      const pin = makePin(slug, pg, version);
      if (!pin) continue;
      picked.push(pin); titles.add(pin.headline); files.add(pin.file); versions[`${slug}${pg.path}`] = version;
      break;
    }
  }
  if (picked.length >= count) break;
}

if (!picked.length) { console.log("No new pins possible: every page already has two versions. Add pages or hand-written pins."); process.exit(0); }
for (const p of picked) console.log(`+ ${p.headline} | ${p.board} | ${bySlug[p.slug].url}${p.path} | ${p.visual}`);
if (dry) { console.log("(dry run: nothing written)"); process.exit(0); }
cfg.pins.push(...picked);
writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2) + "\n");
execFileSync("node", [join(ROOT, "tools/pins.mjs"), "--only", picked.map(p => p.file).join(",")], { stdio: "inherit" });
