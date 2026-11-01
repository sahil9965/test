// Favicons that Google Search can use, for every live site and the hub.
// Google needs a crawlable icon (not a data: URI) that is a multiple of 48 px, and likes a 48 px raster plus an SVG and an apple-touch-icon.
// 1. Makes, from each site's favicon.svg (when missing, or with --force):
//      favicon.ico  (16, 32 and 48 px PNG images),  apple-touch-icon.png (180 px, kept if the site already has one)
// 2. Puts the same <link> block, between <!--FAVICON:START--> and <!--FAVICON:END-->, into every HTML page,
//    replacing any older icon or apple-touch-icon tags. Safe to run again.
// Usage: node tools/favicons.mjs [--force]      (finalize.mjs runs it, so regenerated pages keep the block)
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const force = process.argv.includes("--force");
const sites = JSON.parse(readFileSync(join(root, "sites.json"), "utf8")).filter(s => s.live !== false).map(s => s.slug).concat("hub");

export const BLOCK = '<!--FAVICON:START--><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><!--FAVICON:END-->';

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (f === "node_modules") continue;
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p, out) : f.endsWith(".html") && out.push(p);
  }
  return out;
}

export function inject(html) {
  const marked = /<!--FAVICON:START-->[\s\S]*?<!--FAVICON:END-->/;
  if (marked.test(html)) return html.replace(marked, () => BLOCK);
  const tag = /<link\b[^>]*\brel="(?:shortcut icon|icon|apple-touch-icon)"[^>]*>\s*/gi;
  let first = -1;
  html = html.replace(tag, (m, off) => { if (first < 0) first = off; return first === off ? "\u0000FAV\u0000" : ""; });
  if (first >= 0) return html.replace("\u0000FAV\u0000", () => BLOCK);
  return html.replace(/<\/head>/i, () => BLOCK + "</head>");
}

function ico(images) { // images: [{size, png: Buffer}]
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0); e.writeUInt8(size, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12); offset += png.length;
    return e;
  });
  return Buffer.concat([head, ...entries, ...images.map(i => i.png)]);
}

async function render(svgPath, sizes) {
  const m = await import("playwright");
  const chromium = m.chromium || m.default.chromium;
  let browser;
  try { browser = await chromium.launch(); } catch { browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" }); }
  const svg = readFileSync(svgPath);
  const uri = "data:image/svg+xml;base64," + svg.toString("base64");
  const out = {};
  const page = await browser.newPage();
  for (const s of sizes) {
    await page.setViewportSize({ width: s, height: s });
    await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${uri}" width="${s}" height="${s}" style="display:block"></body></html>`);
    await page.waitForFunction(() => document.images[0].complete);
    out[s] = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: s, height: s }, type: "png" });
  }
  await browser.close();
  return out;
}

let made = 0, pages = 0;
for (const slug of sites) {
  const dir = join(root, "sites", slug);
  const svg = join(dir, "favicon.svg");
  if (!existsSync(svg)) { console.log(`skip ${slug}: no favicon.svg`); continue; }
  const needIco = force || !existsSync(join(dir, "favicon.ico"));
  const needApple = force || !existsSync(join(dir, "apple-touch-icon.png"));
  if (needIco || needApple) {
    const png = await render(svg, [16, 32, 48, 180]);
    if (needIco) { writeFileSync(join(dir, "favicon.ico"), ico([16, 32, 48].map(size => ({ size, png: png[size] })))); made++; }
    if (needApple) { writeFileSync(join(dir, "apple-touch-icon.png"), png[180]); made++; }
  }
  for (const f of walk(dir)) {
    const before = readFileSync(f, "utf8");
    const after = inject(before);
    if (after !== before) { writeFileSync(f, after); pages++; }
  }
}
console.log(`favicons: ${made} icon files written, ${pages} pages updated`);
