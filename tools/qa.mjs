// Browser smoke test for one site: loads every page on desktop + mobile, fails on JS errors,
// failed local requests or horizontal scroll at 390px, and saves screenshots.
// Usage: node tools/qa.mjs sites/<slug> [screenshotDir]
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { chromium } from "playwright";

const dir = process.argv[2];
const shots = process.argv[3];
if (shots) mkdirSync(shots, { recursive: true });
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };
const resolve = url => {
  const p = decodeURIComponent(url.split(/[?#]/)[0]);
  const cands = p === "/" ? ["index.html"] : [p.slice(1), p.slice(1) + ".html", join(p.slice(1), "index.html")];
  return cands.map(c => join(dir, c)).find(f => existsSync(f) && statSync(f).isFile());
};
const server = createServer((req, res) => {
  if (req.url.startsWith("/_vercel/")) { res.writeHead(200, { "Content-Type": "text/javascript" }); return res.end(""); }
  const f = resolve(req.url);
  if (!f) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "Content-Type": types[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
}).listen(0);
const base = `http://localhost:${server.address().port}`;
const pages = readdirSync(dir, { recursive: true }).filter(f => f.endsWith(".html") && !String(f).includes("node_modules")).map(f => "/" + String(f).replace(/\\/g, "/").replace(/index\.html$/, "").replace(/\.html$/, ""));

const b = await chromium.launch();
let failures = 0;
for (const [vw, vh, tag] of [[1280, 900, "desktop"], [390, 844, "mobile"]]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh } });
  for (const path of pages) {
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push("pageerror: " + e.message));
    p.on("console", m => { if (m.type() === "error" && !/favicon|_vercel|\/api\//.test(m.text())) errs.push("console: " + m.text()); });
    p.on("requestfailed", r => { if (r.url().startsWith(base) && !/\/api\//.test(r.url())) errs.push("requestfailed: " + r.url()); });
    p.on("response", r => { if (r.url().startsWith(base) && r.status() >= 400 && !/\/api\//.test(r.url())) errs.push(`HTTP ${r.status()}: ${r.url().slice(base.length)}`); });
    await p.goto(base + path, { waitUntil: "load" });
    await p.waitForTimeout(300);
    if (tag === "mobile") {
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) errs.push(`horizontal scroll ${over}px at 390px width`);
    }
    if (shots && (path === "/" || pages.length <= 4)) await p.screenshot({ path: join(shots, `${tag}${path === "/" ? "-home" : path.replace(/\//g, "-")}.png`), fullPage: false });
    if (errs.length) { failures += errs.length; console.log(`FAIL ${tag} ${path}\n  ` + errs.join("\n  ")); }
    else console.log(`ok   ${tag} ${path}`);
    await p.close();
  }
  await ctx.close();
}
await b.close();
server.close();
console.log(failures ? `QA ${dir}: ${failures} problems` : `QA ${dir}: all ${pages.length} pages clean`);
process.exitCode = failures ? 1 : 0;
