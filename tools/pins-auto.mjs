// Adds the day's automatic Pinterest pins to tools/pins-auto.json ("per_day" of them) and draws them with tools/pins.mjs.
// A pin only repeats what its page already says: the page's <h1> (headline), its first intro sentence or the tool's tagline (subline),
// its meta description, and the tool's feature badges (the points in pins-auto.json). No AI and no made-up claims.
// Skipped: about, privacy and 404 pages, noindex pages, and India pages (lang en-IN; Pinterest traffic is mostly US and UK).
// Each page gives several pins, used in this order: its <h1>, the first part of its <title>, then its FAQ questions (the question is the
// headline, the start of the answer the subline and description; brand-name and privacy questions are skipped). A page with fewer pins
// always goes first, so every page gets its first pin before any page gets a second.
// Order: tools take turns (the one whose last pin is longest ago goes first; money tools come round about twice as often), never the
// same tool twice in one day. It prints how many pins are left; the workflow opens a GitHub issue when that is under 30 days.
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
// default: top today up to per_day (pins already added today count), so the twice-daily schedule never adds more than per_day a day
const today = new Date().toISOString().slice(0, 10);
const doneToday = (cfg.pins || []).filter(p => p.added === today).length;
const argCount = process.argv.find(a => /^\d+$/.test(a));
const count = argCount ? Number(argCount) : Math.max(0, (cfg.per_day || 3) - doneToday);
const dry = process.argv.includes("--dry-run");
const MONEY_BONUS = 9;          // a money tool is due again this many schedule places sooner
const MAX_HEADLINE = 48;        // longer headlines take 3 lines on the image
const MAX_QUESTION = 60;        // FAQ questions may be longer: tools/pins.mjs shrinks the headline to fit

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
  const faqHtml = html.split('id="faq"')[1] || "";
  const faq = [...faqHtml.matchAll(/<details><summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)].map(m => ({ q: text(m[1]), a: text(m[2]) }));
  return { path: f === "index.html" ? "/" : "/" + f.slice(0, -5), h1, title, desc, lede, faq };
}

function pages(slug) {
  const dir = join(ROOT, "sites", slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith(".html") && !/^(about|privacy|404)\.html$/.test(f))
    .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)))
    .map(f => readPage(slug, f)).filter(Boolean);
}

const BRANDS = new RegExp(`\\b(${sites.map(s => s.name).join("|")}|rooh)\\b`, "i");
const firstSentence = t => (String(t || "").split(/(?<=[.!?])\s+/)[0] || "").replace(/[.!?]$/, "");
const upTo = (t, n) => { let out = ""; for (const x of String(t).split(/(?<=[.!?])\s+/)) { if ((out + " " + x).trim().length > n) break; out = (out + " " + x).trim(); } return out || String(t).slice(0, n); };

// every pin a page can give, in order: <h1>, <title>, then FAQ questions
function candidates(slug, pg) {
  const site = bySlug[slug], out = [];
  let h = cleanHead(pg.h1);
  const t = cleanHead(pg.title.split(/\s+[—–|]\s+|\s+-\s+/)[0]);
  if (h.length > MAX_HEADLINE) h = t;
  const lede = firstSentence(pg.lede);
  if (h && h.length <= MAX_HEADLINE) out.push({ headline: h, sub: lede && lede.length <= 64 ? lede : site.tagline, desc: pg.desc });
  if (t && t.length <= MAX_HEADLINE) out.push({ headline: t, sub: site.tagline, desc: pg.desc });
  for (const { q, a } of pg.faq) {
    if (q.length < 18 || q.length > MAX_QUESTION || BRANDS.test(q) || /privacy|private|upload|account|data|cookie|safe|secure|offline/i.test(q)) continue;
    const s1 = firstSentence(a);
    out.push({ headline: q, sub: s1 && s1.length <= 64 && s1.length > 3 ? s1 : site.tagline, desc: `${upTo(a, 380)} Free tool: ${new URL(site.url).host}` });
  }
  return out.filter(c => c.sub && c.sub !== c.headline && c.desc.length < 500);
}

function makePin(slug, pg, c) {
  const cfgSite = cfg.sites[slug];
  let file = slugify(c.headline).slice(0, 70).replace(/-$/, "");
  for (let n = 2; files.has(file); n++) file = `${file.replace(/-\d+$/, "")}-${n}`;
  const visual = Object.entries(cfgSite.visual_by_path || {}).find(([re]) => new RegExp(re).test(pg.path))?.[1] || cfgSite.visual;
  const kw = [...new Set([cleanHead(pg.h1).toLowerCase().replace(/^free /, ""), ...cfgSite.keywords.split(/,\s*/)])].slice(0, 5).join(", ");
  return { slug, file, path: pg.path, board: cfgSite.board, headline: c.headline, sub: c.sub, points: cfgSite.points, visual, desc: c.desc.slice(0, 480),
    keywords: kw, added: new Date().toISOString().slice(0, 10) };
}

// tools in turn order: longest since their last pin first, money tools due sooner
const order = sites.map(s => s.slug).sort((a, b) =>
  ((last[a] ?? -99) - (cfg.money.includes(a) ? MONEY_BONUS : 0)) - ((last[b] ?? -99) - (cfg.money.includes(b) ? MONEY_BONUS : 0)) || a.localeCompare(b));
const lastSlug = schedule.length ? byHost[new URL(schedule[schedule.length - 1].link).host] : null;
const pageCache = Object.fromEntries(sites.map(s => [s.slug, pages(s.slug)]));
const unused = (slug, pg) => candidates(slug, pg).filter(c => !titles.has(c.headline));
const picked = [];
for (const slug of order) {
  if (picked.length >= count) break;
  if (picked.length === 0 && slug === lastSlug) continue;
  // the page with the fewest pins that still has an unused headline (home page first on ties)
  const pg = pageCache[slug].filter(p => unused(slug, p).length).sort((a, b) => (versions[`${slug}${a.path}`] || 0) - (versions[`${slug}${b.path}`] || 0))[0];
  if (!pg) continue;
  const pin = makePin(slug, pg, unused(slug, pg)[0]);
  picked.push(pin); titles.add(pin.headline); files.add(pin.file); versions[`${slug}${pg.path}`] = (versions[`${slug}${pg.path}`] || 0) + 1;
}
const left = sites.reduce((n, s) => n + pageCache[s.slug].reduce((m, p) => m + unused(s.slug, p).length, 0), 0);
const days = Math.floor(left / (cfg.per_day || 3));
console.log(`pins left to make: ${left} (about ${days} days at ${cfg.per_day || 3} a day)`);
if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `left=${left}\ndays=${days}\n`, { flag: "a" });

if (!count) { console.log(`Already ${doneToday} pins added today (${today}); nothing to do.`); process.exit(0); }
if (!picked.length) { console.log("No new pins possible: every page and FAQ question already has a pin. Add pages or hand-written pins."); process.exit(0); }
for (const p of picked) console.log(`+ ${p.headline} | ${p.board} | ${bySlug[p.slug].url}${p.path} | ${p.visual}`);
if (dry) { console.log("(dry run: nothing written)"); process.exit(0); }
cfg.pins.push(...picked);
writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2) + "\n");
execFileSync("node", [join(ROOT, "tools/pins.mjs"), "--only", picked.map(p => p.file).join(",")], { stdio: "inherit" });
